"""Supabase Auth token verification and authenticated API rate limiting."""
import logging
import time
from collections import deque
from threading import Lock
from typing import Any, Dict

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import config

logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)
_rate_limit_events = {}
_rate_limit_lock = Lock()

def _enforce_user_rate_limit(uid: str) -> None:
    """Apply a process-local sliding-window limit to authenticated API usage."""
    now = time.monotonic()
    limit = config.RATE_LIMIT_REQUESTS_PER_MINUTE
    with _rate_limit_lock:
        events = _rate_limit_events.setdefault(uid, deque())
        while events and now - events[0] >= 60:
            events.popleft()
        if len(events) >= limit:
            retry_after = max(1, int(60 - (now - events[0])))
            raise HTTPException(status_code=429, detail="Request rate limit exceeded. Please wait before trying again.", headers={"Retry-After": str(retry_after)})
        events.append(now)
        if len(_rate_limit_events) > 10000:
            stale = [key for key, recent in _rate_limit_events.items() if not recent or now - recent[-1] >= 60]
            for key in stale:
                _rate_limit_events.pop(key, None)

async def get_current_user(credentials_header: HTTPAuthorizationCredentials = Depends(_bearer)) -> Dict[str, Any]:
    """Validate the bearer token with Supabase Auth and return verified user data."""
    if credentials_header is None or credentials_header.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required.", headers={"WWW-Authenticate": "Bearer"})
    if not config.SUPABASE_URL or not config.SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="Authentication is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{config.SUPABASE_URL}/auth/v1/user",
                headers={"apikey": config.SUPABASE_ANON_KEY, "Authorization": f"Bearer {credentials_header.credentials}"},
            )
        if response.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token.", headers={"WWW-Authenticate": "Bearer"})
        response.raise_for_status()
        user = response.json()
        uid = user.get("id")
        if not uid:
            raise ValueError("Supabase Auth response has no user identifier")
        _enforce_user_rate_limit(uid)
        return {**user, "uid": uid, "sub": uid}
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        logger.warning("Supabase Auth validation returned HTTP %s", exc.response.status_code)
        raise HTTPException(status_code=503, detail="Authentication service is temporarily unavailable.") from exc
    except Exception as exc:
        logger.warning("Supabase Auth validation failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Authentication service is temporarily unavailable.") from exc
