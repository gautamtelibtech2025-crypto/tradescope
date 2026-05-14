from __future__ import annotations

from app.models.schemas import ActionResult
from app.websocket.connection_manager import ConnectionManager


class NotificationService:
    def __init__(self, ws_manager: ConnectionManager) -> None:
        self.ws_manager = ws_manager

    async def read_notifications(self, user_id: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "read_notifications"}
        )
        return ActionResult(
            success=True, action="read_notifications", message="Reading latest notifications"
        )

