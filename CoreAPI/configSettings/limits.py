"""
Per-IP rate limiting.

Lives in its own module so routers can import the limiter without importing
main.py (which imports the routers -- a circular import otherwise).

The client IP is read from the connection, which behind Caddy would be
127.0.0.1 for every request and put the whole internet in one bucket. uvicorn
is started with `--proxy-headers --forwarded-allow-ips=127.0.0.1`, so it
rewrites the peer address from X-Forwarded-For before this sees it. If that
flag is ever dropped from the systemd unit, rate limiting silently becomes
global rather than per-client.

Counters are in-process, so they reset on restart and are not shared between
workers. That is fine for a single-worker deployment; running multiple workers
would need a shared backend.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# The default applies to any route without its own decorator, so a new
# endpoint is protected before anyone remembers to think about it.
limiter = Limiter(key_func=get_remote_address, default_limits=["600/hour"])
