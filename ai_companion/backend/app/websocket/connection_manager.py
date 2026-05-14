from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.user_sockets: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, socket: WebSocket) -> None:
        await socket.accept()
        self.user_sockets[user_id].add(socket)

    def disconnect(self, user_id: str, socket: WebSocket) -> None:
        self.user_sockets[user_id].discard(socket)
        if not self.user_sockets[user_id]:
            self.user_sockets.pop(user_id, None)

    async def send_json(self, user_id: str, payload: dict[str, Any]) -> None:
        for socket in self.user_sockets.get(user_id, set()):
            await socket.send_json(payload)

    async def send_device_command(self, user_id: str, command: dict[str, Any]) -> None:
        await self.send_json(user_id, {"channel": "device_command", "payload": command})

