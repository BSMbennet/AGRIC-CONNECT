import os
from dotenv import load_dotenv
from typing import List
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Config:
    # NVIDIA NIM Configuration
    NVIDIA_NIM_BASE_URL = os.getenv("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_NGC_API_KEY = os.getenv("NVIDIA_NGC_API_KEY", "")

    LLM_MODEL = os.getenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")
    VLM_MODEL = os.getenv("VLM_MODEL", "meta/llama-3.2-11b-vision-instruct")

    # Supabase Auth configuration. Use the project URL and publishable/anon key only.
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
    # Server-only credential for Supabase Auth admin operations; never expose to Vite.
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    # Stripe billing. Keep secret keys and webhook signing secrets server-side only.
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    STRIPE_PRICE_MONTHLY = os.getenv("STRIPE_PRICE_MONTHLY", "").strip()
    STRIPE_ALLOW_LIVE = os.getenv("STRIPE_ALLOW_LIVE", "false").strip().lower() == "true"
    STRIPE_DISPLAY_CURRENCY = os.getenv("STRIPE_DISPLAY_CURRENCY", "ZAR").strip().upper()
    STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "https://ubuntu-agric-chat-inky.vercel.app/billing?checkout=success")
    STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "https://ubuntu-agric-chat-inky.vercel.app/billing?checkout=cancelled")
    STRIPE_PORTAL_RETURN_URL = os.getenv("STRIPE_PORTAL_RETURN_URL", "https://ubuntu-agric-chat-inky.vercel.app/billing")

    # Weather API
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

    # CORS: production frontend plus local development by default.
    # Set ALLOWED_ORIGINS in the hosting environment to the exact comma-separated
    # list of origins that should be allowed. Do not use wildcard origins with credentials.
    _allowed_origins_raw = os.getenv(
        "ALLOWED_ORIGINS",
        "https://ubuntu-agric-chat-inky.vercel.app,http://localhost:5173",
    )
    # Always retain the production origin even when a hosting override is incomplete.
    _configured_origins = [
        origin.strip().rstrip("/")
        for origin in _allowed_origins_raw.split(",")
        if origin.strip()
    ]
    ALLOWED_ORIGINS: List[str] = list(dict.fromkeys(
        ["https://ubuntu-agric-chat-inky.vercel.app"] + [
            origin for origin in _configured_origins
            if origin.startswith("https://") or origin in {"http://localhost:5173", "http://127.0.0.1:5173"}
        ]
    ))

    UPLOAD_DIR = "uploads"
    MAX_FILE_SIZE = 10 * 1024 * 1024
    # Multipart overhead is allowed; production ingress must enforce its own body cap too.
    MAX_REQUEST_SIZE = 12 * 1024 * 1024
    RATE_LIMIT_REQUESTS_PER_MINUTE = max(1, int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "30")))

    @classmethod
    def log_config(cls):
        logger.info("=" * 50)
        logger.info("UBUNTU AGRI CHAT CONFIGURATION")
        logger.info("=" * 50)
        logger.info("NVIDIA NIM URL: %s", cls.NVIDIA_NIM_BASE_URL)
        logger.info("LLM Model: %s", cls.LLM_MODEL)
        logger.info("Vision Model: %s", cls.VLM_MODEL)
        logger.info("NVIDIA API Key: %s", "Set" if cls.NVIDIA_NGC_API_KEY else "Missing")
        logger.info("Weather API: %s", "Set" if cls.OPENWEATHER_API_KEY else "Missing")
        logger.info("Allowed origins configured: %d", len(cls.ALLOWED_ORIGINS))
        logger.info("=" * 50)


config = Config()
config.log_config()
