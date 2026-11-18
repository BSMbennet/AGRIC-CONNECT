"""AgricNorthX Render integration adapter.

Supabase remains the system of record. Stripe Checkout is restricted to test keys,
and seller earnings are recorded in Supabase; this service does not create transfers
or payouts to South African farmers.
"""
import hashlib
import hmac
import json
import os
import secrets
import string
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from stripe import StripeClient
from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI(title="AgricNorthX Integration Adapter", version="0.2.0")
PROVIDER_WEBHOOK_SECRET = os.getenv("PROVIDER_WEBHOOK_SECRET", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


def _required_env(*names: str) -> dict[str, str]:
    values = {name: os.getenv(name, "").strip() for name in names}
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise HTTPException(status_code=503, detail="Integration service is not fully configured")
    return values


def _test_stripe_key() -> str:
    key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not key.startswith(("sk_test_", "rk_test_")):
        raise HTTPException(status_code=503, detail="Stripe test-mode credentials are required")
    return key


def _integration_identifier(flow: str, stable_seed: str | None = None) -> str:
    if stable_seed:
        # The seed is a random UUID created for this payment attempt, keeping
        # the required eight-letter label stable across idempotent retries.
        digest = hashlib.sha256(stable_seed.encode()).digest()
        suffix = "".join(string.ascii_lowercase[value % 26] for value in digest[:8])
    else:
        suffix = "".join(secrets.choice(string.ascii_lowercase) for _ in range(8))
    return f"agricnorthx-{flow}-{suffix}"


def _verify_stripe_signature(payload: bytes, signature_header: str, secret: str) -> bool:
    parts = [item.split("=", 1) for item in signature_header.split(",") if "=" in item]
    timestamp = next((value for key, value in parts if key == "t"), "")
    signatures = [value for key, value in parts if key == "v1"]
    try:
        timestamp_int = int(timestamp)
    except (TypeError, ValueError):
        return False
    if abs(time.time() - timestamp_int) > 300 or not signatures:
        return False
    signed_payload = timestamp.encode() + b"." + payload
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, candidate) for candidate in signatures)


async def _authenticate_frontend_request(request: Request, required_role: str) -> tuple[dict[str, str], dict[str, Any], str]:
    config = _required_env(
        "AGRIC_CONNECT_INTERNAL_TOKEN",
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "AGRICNORTHX_APP_URL",
    )
    public_key = os.getenv("SUPABASE_ANON_KEY", "").strip() or os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if not public_key:
        raise HTTPException(status_code=503, detail="Integration service is not fully configured")
    config["SUPABASE_ANON_KEY"] = public_key
    supplied_internal = request.headers.get("x-integration-token", "")
    if not hmac.compare_digest(config["AGRIC_CONNECT_INTERNAL_TOKEN"], supplied_internal):
        raise HTTPException(status_code=401, detail="Unauthorized integration request")
    authorization = request.headers.get("authorization", "")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="A signed-in user session is required")

    headers = {"apikey": config["SUPABASE_ANON_KEY"], "Authorization": authorization}
    async with httpx.AsyncClient(timeout=15) as client:
        user_response = await client.get(config["SUPABASE_URL"] + "/auth/v1/user", headers=headers)
        if user_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Supabase session is invalid or expired")
        user = user_response.json()
        user_id = str(user.get("id", ""))
        if not user_id:
            raise HTTPException(status_code=401, detail="Supabase user identity is missing")
        profile_response = await client.get(
            config["SUPABASE_URL"] + "/rest/v1/profiles",
            params={"id": "eq." + user_id, "select": "role"},
            headers=headers,
        )
        if profile_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Unable to validate the AgricNorthX profile")
        profiles = profile_response.json()
        if not profiles or profiles[0].get("role") != required_role:
            raise HTTPException(status_code=403, detail="This checkout is not available for your account role")
    return config, user, authorization


async def _admin_patch_payment(config: dict[str, str], payment_id: str, payload: dict[str, Any]) -> None:
    headers = {
        "apikey": config["SUPABASE_SECRET_KEY"],
        "Authorization": "Bearer " + config["SUPABASE_SECRET_KEY"],
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.patch(
            config["SUPABASE_URL"] + "/rest/v1/order_payments",
            params={"id": "eq." + payment_id},
            headers=headers,
            json=payload,
        )
        if response.status_code not in (200, 204):
            raise HTTPException(status_code=502, detail="Unable to save the payment attempt")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "agricnorthx-integration-adapter", "status": "running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready")
async def ready() -> dict[str, Any]:
    payment_configured = all(os.getenv(key) for key in (
        "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SUPABASE_URL",
        "SUPABASE_SECRET_KEY", "AGRIC_CONNECT_INTERNAL_TOKEN", "AGRICNORTHX_APP_URL",
    ))
    public_key_configured = bool(os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY"))
    payment_configured = payment_configured and public_key_configured
    return {
        "status": "ready" if payment_configured or PROVIDER_WEBHOOK_SECRET else "not_configured",
        "provider_webhooks": "enabled" if PROVIDER_WEBHOOK_SECRET else "disabled",
        "stripe_test_checkout": "enabled" if payment_configured and os.getenv("STRIPE_SECRET_KEY", "").startswith(("sk_test_", "rk_test_")) else "disabled",
        "stripe_webhooks": "enabled" if STRIPE_WEBHOOK_SECRET else "disabled",
    }


@app.post("/v1/checkout/subscriptions")
async def create_subscription_checkout(request: Request) -> dict[str, str]:
    config, user, authorization = await _authenticate_frontend_request(request, "farmer")
    stripe_key = _test_stripe_key()
    try:
        payload = await request.json()
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    plan = str(payload.get("plan", ""))
    plans = {
        "pro": {"name": "AgricNorthX Farmer Pro", "amount": 9900},
        "premium": {"name": "AgricNorthX Farmer Premium", "amount": 19900},
    }
    if plan not in plans:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    headers = {"apikey": config["SUPABASE_ANON_KEY"], "Authorization": authorization}
    async with httpx.AsyncClient(timeout=20) as http:
        active_response = await http.get(
            config["SUPABASE_URL"] + "/rest/v1/farmer_subscriptions",
            params={
                "farmer_id": "eq." + str(user["id"]),
                "status": "in.(active,trialing)",
                "current_period_end": "gt." + datetime.now(timezone.utc).isoformat(),
                "select": "id",
                "limit": "1",
            },
            headers=headers,
        )
        if active_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Unable to check the current subscription")
        if active_response.json():
            raise HTTPException(status_code=409, detail="An active subscription already exists")

    spec = plans[plan]
    app_url = config["AGRICNORTHX_APP_URL"].rstrip("/")
    params: dict[str, Any] = {
        "mode": "subscription",
        "line_items": [{
            "price_data": {
                "currency": "zar",
                "unit_amount": spec["amount"],
                "product_data": {"name": spec["name"]},
                "recurring": {"interval": "month"},
            },
            "quantity": 1,
        }],
        "success_url": app_url + "/subscriptions?status=success",
        "cancel_url": app_url + "/subscriptions?status=cancelled",
        "client_reference_id": str(user["id"]),
        "metadata": {"farmer_id": str(user["id"]), "plan": plan},
        "subscription_data": {"metadata": {"farmer_id": str(user["id"]), "plan": plan}},
        "integration_identifier": _integration_identifier("subscription"),
    }
    if user.get("email"):
        params["customer_email"] = str(user["email"])

    stripe_client = StripeClient(stripe_key)
    try:
        session = await stripe_client.v1.checkout.sessions.create_async(params=params)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Stripe could not create the test subscription Checkout Session") from exc
    checkout_url = getattr(session, "url", None)
    if not checkout_url:
        raise HTTPException(status_code=502, detail="Stripe did not return a subscription Checkout URL")
    return {"checkout_url": checkout_url}


@app.post("/v1/checkout/orders/{order_id}")
async def create_order_checkout(order_id: str, request: Request) -> dict[str, str]:
    config, user, authorization = await _authenticate_frontend_request(request, "buyer")
    stripe_key = _test_stripe_key()
    if len(order_id) != 36:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    try:
        payload = await request.json()
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    payment_kind = str(payload.get("payment_kind", ""))
    if payment_kind not in ("deposit", "balance"):
        raise HTTPException(status_code=400, detail="Invalid payment type")

    async with httpx.AsyncClient(timeout=20) as http:
        attempt_response = await http.post(
            config["SUPABASE_URL"] + "/rest/v1/rpc/create_order_payment_attempt",
            headers={
                "apikey": config["SUPABASE_ANON_KEY"],
                "Authorization": authorization,
                "Content-Type": "application/json",
            },
            json={"p_order_id": order_id, "p_payment_kind": payment_kind},
        )
        if attempt_response.status_code >= 400:
            detail = "The order is not ready for this payment. Refresh the order and try again."
            try:
                detail = str(attempt_response.json().get("message", detail))
            except (ValueError, json.JSONDecodeError):
                pass
            raise HTTPException(status_code=409, detail=detail)
        attempt_data = attempt_response.json()
        attempt = attempt_data[0] if isinstance(attempt_data, list) and attempt_data else attempt_data
        payment_id = str(attempt.get("payment_id", ""))
        amount_minor = int(attempt.get("amount_minor", 0))
        currency = str(attempt.get("currency", "ZAR")).lower()
        if not payment_id or amount_minor <= 0 or currency != "zar":
            raise HTTPException(status_code=502, detail="The payment amount could not be verified")

    app_url = config["AGRICNORTHX_APP_URL"].rstrip("/")
    params: dict[str, Any] = {
        "mode": "payment",
        "line_items": [{
            "price_data": {
                "currency": currency,
                "unit_amount": amount_minor,
                "product_data": {"name": "AgricNorthX order " + payment_kind},
            },
            "quantity": 1,
        }],
        "success_url": app_url + "/orders/" + order_id + "?payment=returned&session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": app_url + "/orders/" + order_id + "?payment=cancelled",
        "client_reference_id": str(user["id"]),
        "metadata": {
            "payment_id": payment_id,
            "order_id": order_id,
            "buyer_id": str(user["id"]),
            "payment_kind": payment_kind,
        },
        "payment_intent_data": {
            "metadata": {"payment_id": payment_id, "order_id": order_id},
        },
        "integration_identifier": _integration_identifier("order", payment_id),
    }

    stripe_client = StripeClient(stripe_key)
    try:
        session = await stripe_client.v1.checkout.sessions.create_async(
            params=params,
            options={"idempotency_key": "agricnorthx-checkout-" + payment_id},
        )
    except Exception as exc:
        # Keep the attempt pending after an ambiguous network/API failure. Stripe
        # idempotency lets a retry recover the same Checkout Session safely.
        raise HTTPException(status_code=502, detail="Stripe could not create the test payment Checkout Session") from exc

    session_id = getattr(session, "id", None)
    checkout_url = getattr(session, "url", None)
    if not session_id or not checkout_url:
        raise HTTPException(status_code=502, detail="Stripe did not return a payment Checkout URL")

    await _admin_patch_payment(config, payment_id, {
        "stripe_checkout_session_id": session_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": checkout_url}


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(default="", alias="Stripe-Signature")) -> dict[str, str]:
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")
    raw = await request.body()
    if not _verify_stripe_signature(raw, stripe_signature, STRIPE_WEBHOOK_SECRET):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    try:
        event = json.loads(raw)
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid Stripe event body")
    if event.get("livemode") is not False:
        raise HTTPException(status_code=403, detail="Live-mode Stripe events are disabled for this integration")

    event_type = str(event.get("type", ""))
    obj = (event.get("data") or {}).get("object") or {}
    event_id = str(event.get("id", ""))
    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded") and obj.get("mode") == "payment":
        if obj.get("payment_status") != "paid":
            return {"status": "received", "payment": "awaiting_async_confirmation"}
        payment_id = str((obj.get("metadata") or {}).get("payment_id", ""))
        amount_total = int(obj.get("amount_total") or 0)
        currency = str(obj.get("currency") or "")
        if not payment_id or not event_id:
            raise HTTPException(status_code=400, detail="Order payment metadata is missing")
        config = _required_env("SUPABASE_URL", "SUPABASE_SECRET_KEY")
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                config["SUPABASE_URL"] + "/rest/v1/rpc/record_order_payment_success",
                headers={
                    "apikey": config["SUPABASE_SECRET_KEY"],
                    "Authorization": "Bearer " + config["SUPABASE_SECRET_KEY"],
                    "Content-Type": "application/json",
                },
                json={
                    "p_payment_id": payment_id,
                    "p_stripe_checkout_session_id": str(obj.get("id") or ""),
                    "p_stripe_payment_intent_id": str(obj.get("payment_intent") or ""),
                    "p_event_id": event_id,
                    "p_event_type": event_type,
                    "p_amount_minor": amount_total,
                    "p_currency": currency,
                },
            )
            if response.status_code >= 400:
                raise HTTPException(status_code=502, detail="Order payment could not be recorded")
    elif event_type in ("checkout.session.async_payment_failed", "checkout.session.expired") and obj.get("mode") == "payment":
        payment_id = str((obj.get("metadata") or {}).get("payment_id", ""))
        if payment_id and event_id:
            config = _required_env("SUPABASE_URL", "SUPABASE_SECRET_KEY")
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    config["SUPABASE_URL"] + "/rest/v1/rpc/record_order_payment_failure",
                    headers={
                        "apikey": config["SUPABASE_SECRET_KEY"],
                        "Authorization": "Bearer " + config["SUPABASE_SECRET_KEY"],
                        "Content-Type": "application/json",
                    },
                    json={
                        "p_payment_id": payment_id,
                        "p_event_id": event_id,
                        "p_event_type": event_type,
                        "p_failure_status": "expired" if event_type.endswith(".expired") else "failed",
                    },
                )
                if response.status_code >= 400:
                    raise HTTPException(status_code=502, detail="Failed payment status could not be recorded")
    return {"status": "received"}


@app.post("/webhooks/provider")
async def provider_webhook(request: Request, x_provider_signature: str = Header(default="")) -> dict[str, str]:
    if not PROVIDER_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Provider webhook is not configured")
    raw = await request.body()
    expected = hmac.new(PROVIDER_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    supplied = x_provider_signature.removeprefix("sha256=")
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Invalid provider signature")
    return {"status": "received", "message": "Provider webhook accepted; no marketplace transaction was changed"}
