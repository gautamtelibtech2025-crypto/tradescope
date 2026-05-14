from __future__ import annotations

from app.websocket.connection_manager import ConnectionManager


class RealtimeWebSocketService:
    def __init__(self, manager: ConnectionManager) -> None:
        self.manager = manager

    async def broadcast_assistant_state(self, user_id: str, state: str) -> None:
        await self.manager.send_json(
            user_id,
            {"channel": "assistant_state", "payload": {"state": state}},
        )

