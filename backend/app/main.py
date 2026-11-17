from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
import time
import re
from uuid import uuid4
from datetime import datetime, timezone

from app.config import config
from app.routes import chat_router, diagnosis_router, weather_router, market_router, voice_router, account_router, billing_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs(config.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Ubuntu Agri Chat",
    description="AI-powered farming assistant",
    version="1.0.0",
)

# Use a configured origin allowlist; never combine wildcard origins with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    supplied_request_id = request.headers.get("x-request-id", "")
    request_id = supplied_request_id if re.fullmatch(r"[A-Za-z0-9._-]{1,64}", supplied_request_id) else str(uuid4())
    request.state.request_id = request_id
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > config.MAX_REQUEST_SIZE:
                response = JSONResponse(
                    {"detail": "Request body exceeds the configured size limit."},
                    status_code=413,
                )
                response.headers["X-Process-Time"] = f"{time.perf_counter() - start_time:.6f}"
                response.headers["X-Content-Type-Options"] = "nosniff"
                response.headers["X-Frame-Options"] = "DENY"
                response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"
                response.headers["X-Request-ID"] = request_id
                return response
        except ValueError:
            response = JSONResponse({"detail": "Invalid Content-Length header."}, status_code=400)
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Content-Type-Options"] = "nosniff"
            return response
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.6f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"
    response.headers["X-Request-ID"] = request_id
    if process_time > 5:
        logger.warning("Slow request request_id=%s duration_seconds=%.2f method=%s path=%s", request_id, process_time, request.method, request.url.path)
    return response

app.include_router(chat_router)
app.include_router(diagnosis_router)
app.include_router(weather_router)
app.include_router(market_router)
app.include_router(voice_router)
app.include_router(account_router)
app.include_router(billing_router)

@app.get("/")
async def root():
    return {
        "message": "Ubuntu Agri Chat",
        "version": "1.0.0",
        "status": "running",
        "ai_provider": "NVIDIA NIM",
        "model": {"llm": config.LLM_MODEL, "vision": config.VLM_MODEL},
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "ubuntu-agric-chat-backend",
        "nvidia_nim": "configured" if config.NVIDIA_NGC_API_KEY else "missing",
    }

@app.get("/ready")
async def readiness_check():
    """Report whether essential runtime configuration is present without exposing values."""
    missing = []
    if not config.NVIDIA_NGC_API_KEY:
        missing.append("NVIDIA_NGC_API_KEY")
    if not config.SUPABASE_URL or not config.SUPABASE_ANON_KEY:
        missing.append("SUPABASE_AUTH")
    return JSONResponse(
        {"status": "ready" if not missing else "not_ready", "missing_configuration": missing},
        status_code=200 if not missing else 503,
    )


@app.on_event("startup")
async def startup_event():
    logger.info("Ubuntu Agri Chat backend starting")
    logger.info("NVIDIA NIM key configured: %s", bool(config.NVIDIA_NGC_API_KEY))
    logger.info("LLM model: %s", config.LLM_MODEL)
    logger.info("Vision model: %s", config.VLM_MODEL)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
