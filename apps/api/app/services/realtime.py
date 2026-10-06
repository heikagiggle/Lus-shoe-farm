"""In-process WebSocket fan-out. Works from sync (thread-pool) and async code alike.
For multiple API workers/instances, swap the `push_*` internals for Redis pub/sub."""
import asyncio
from typing import Any

from fastapi import WebSocket


class Hub:
    def __init__(self):
        self.threads: dict[str, set[WebSocket]] = {}
        self.admins: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None

    async def _send(self, sockets: set[WebSocket], payload: dict[str, Any]):
        for ws in list(sockets):
            try:
                await ws.send_json(payload)
            except Exception:
                sockets.discard(ws)

    def _run(self, coro):
        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, self.loop)
        else:
            coro.close()

    def push_admin(self, payload: dict[str, Any]):
        self._run(self._send(self.admins, payload))

    def push_thread(self, key: str, payload: dict[str, Any]):
        self._run(self._send(self.threads.get(key, set()), payload))


hub = Hub()
