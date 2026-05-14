from __future__ import annotations

from app.models.schemas import ActionResult
from app.websocket.connection_manager import ConnectionManager


class AndroidDeviceController:
    def __init__(self, ws_manager: ConnectionManager) -> None:
        self.ws_manager = ws_manager

    async def open_app(self, user_id: str, app_name: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "open_app", "app_name": app_name}
        )
        return ActionResult(success=True, action="open_app", message=f"Opening {app_name}")

    async def close_app(self, user_id: str, app_name: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "close_app", "app_name": app_name}
        )
        return ActionResult(success=True, action="close_app", message=f"Closing {app_name}")

    async def set_volume(self, user_id: str, direction: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "set_volume", "direction": direction}
        )
        return ActionResult(success=True, action="set_volume", message=f"Volume {direction}")

    async def set_brightness(self, user_id: str, direction: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "set_brightness", "direction": direction}
        )
        return ActionResult(success=True, action="set_brightness", message=f"Brightness {direction}")

