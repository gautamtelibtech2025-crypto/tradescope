from __future__ import annotations

from app.models.schemas import ActionResult
from app.websocket.connection_manager import ConnectionManager


class MediaControlService:
    def __init__(self, ws_manager: ConnectionManager) -> None:
        self.ws_manager = ws_manager

    async def play(self, user_id: str) -> ActionResult:
        await self.ws_manager.send_device_command(user_id, {"type": "media_play"})
        return ActionResult(success=True, action="media_play", message="Playing media")

    async def pause(self, user_id: str) -> ActionResult:
        await self.ws_manager.send_device_command(user_id, {"type": "media_pause"})
        return ActionResult(success=True, action="media_pause", message="Paused media")

