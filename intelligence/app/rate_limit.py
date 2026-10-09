"""
Rate limiting. Backend already rate-limits what the CRM's own users can do,
but this service's own URL may be directly reachable (e.g. on Render), so
this is a second, independent backstop — especially on the endpoints that
spend real money per call (Places API, LLM, Serper).

Keyed by X-API-Key when present (so one caller's budget doesn't throttle
another's), falling back to IP.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address


def _key_func(request) -> str:
    return request.headers.get("x-api-key") or get_remote_address(request)


limiter = Limiter(key_func=_key_func, default_limits=["120/minute"])
