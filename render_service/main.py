"""AgriConnect's bounded Render integration adapter.

Supabase remains the marketplace system of record. This service is intentionally
limited to health/readiness and signed-provider webhook intake; it does not
duplicate farmer, listing, buyer or order data.
"""
import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI(title="AgriConnect Integration Adapter", version="0.1.0")
WEBHOOK_SECRET = os.getenv("PROVIDER_WEBHOOK_SECRET", "")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "agriconnect-integration-adapter", "status": "running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready")
async def ready() -> dict[str, Any]:
    return {"status": "ready" if WEBHOOK_SECRET else "not_configured",
            "provider_webhooks": "enabled" if WEBHOOK_SECRET else "disabled"}


@app.post("/webhooks/provider")
async def provider_webhook(request: Request, x_provider_signature: str = Header(default="")) -> dict[str, str]:
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Provider webhook is not configured")
    raw = await request.body()
    expected = hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    supplied = x_provider_signature.removeprefix("sha256=")
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Invalid provider signature")
    # Provider-specific event parsing, idempotency storage and Supabase RPC
    # dispatch must be added when a real provider contract is selected.
    return {"status": "received", "message": "Webhook adapter stub; no transaction was changed"}
