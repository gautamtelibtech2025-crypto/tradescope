from __future__ import annotations

from app.models.schemas import ActionResult
from app.websocket.connection_manager import ConnectionManager


class ContactCallService:
    def __init__(self, ws_manager: ConnectionManager) -> None:
        self.ws_manager = ws_manager

    async def call_contact(self, user_id: str, contact_name: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "call_contact", "contact_name": contact_name}
        )
        return ActionResult(success=True, action="call_contact", message=f"Calling {contact_name}")

    async def send_message(self, user_id: str, contact_name: str) -> ActionResult:
        await self.ws_manager.send_device_command(
            user_id, {"type": "send_message", "contact_name": contact_name}
        )
        return ActionResult(success=True, action="send_message", message=f"Messaging {contact_name}")

