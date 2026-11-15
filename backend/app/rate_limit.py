"""In-memory rate limiting for the scoring endpoints.

A single process holds the counters, which matches the single-instance deployment.
"""

from __future__ import annotations

import time
from collections import OrderedDict, deque
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.auth import require_session

RATE_LIMITED = "Too many requests. Please wait a minute and try again."
CLIENT_HEADER = "x-demo-client"
MAX_CLIENT_KEY_LENGTH = 64
WINDOW_SECONDS = 60.0


class SlidingWindowLimiter:
    """Allows `per_client` requests per client and, if set, `total` overall within a rolling window.

    Not thread-safe; it is only called from the event loop.
    """

    def __init__(
        self, per_client: int, total: int | None = None, clock: Callable[[], float] = time.monotonic
    ) -> None:
        if per_client <= 0 or (total is not None and total <= 0):
            raise ValueError("Rate limits must be positive")
        self.per_client = per_client
        self.total = total
        self.clock = clock
        # Ordered by each client's latest allowed request, so idle clients sit at the front.
        self._clients: OrderedDict[str, deque[float]] = OrderedDict()
        self._all: deque[float] = deque()

    def allow(self, client: str) -> bool:
        now = self.clock()
        cutoff = now - WINDOW_SECONDS
        _expire(self._all, cutoff)
        hits = self._clients.get(client)
        if hits is not None:
            _expire(hits, cutoff)
        over_total = self.total is not None and len(self._all) >= self.total
        if over_total or (hits is not None and len(hits) >= self.per_client):
            return False
        if hits is None:
            hits = self._clients[client] = deque()
        else:
            self._clients.move_to_end(client)
        hits.append(now)
        if self.total is not None:
            self._all.append(now)
        while self._clients:
            oldest = next(iter(self._clients.values()))
            if oldest and oldest[-1] > cutoff:
                break
            self._clients.popitem(last=False)
        return True


def _expire(hits: deque[float], cutoff: float) -> None:
    while hits and hits[0] <= cutoff:
        hits.popleft()


def client_key(request: Request) -> str:
    # The frontend proxy forwards the browser's address; direct callers still share the global cap.
    forwarded = request.headers.get(CLIENT_HEADER, "").strip()
    if forwarded:
        return forwarded[:MAX_CLIENT_KEY_LENGTH]
    return request.client.host if request.client else "unknown"


def _rate_limited() -> HTTPException:
    return HTTPException(429, RATE_LIMITED, headers={"Retry-After": str(int(WINDOW_SECONDS))})


async def require_demo_quota(request: Request) -> None:
    if not request.app.state.demo_limiter.allow(client_key(request)):
        raise _rate_limited()


async def require_assessment_quota(request: Request, claims: Annotated[dict, Depends(require_session)]) -> dict:
    # Keyed by account, so a signed-in user cannot score in bulk by switching networks.
    if not request.app.state.assessment_limiter.allow(str(claims.get("sub", "unknown"))):
        raise _rate_limited()
    return claims
