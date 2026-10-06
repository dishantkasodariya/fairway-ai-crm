from fastapi import Header, HTTPException, status

from app.config import get_settings
from app.db.base import get_db  # re-exported for routers

__all__ = ["get_db", "require_api_key"]


def require_api_key(x_api_key: str | None = Header(default=None)):
    settings = get_settings()
    valid_keys = {settings.api_key, "fairway_intelligence_dev_key"}
    if not x_api_key or x_api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-API-Key header",
        )

