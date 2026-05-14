from __future__ import annotations

from app.models.schemas import ActionResult, ReminderCreate
from app.websocket.connection_manager import ConnectionManager


class ReminderEngine:
    def __init__(self, ws_manager: ConnectionManager) -> None:
        self.ws_manager = ws_manager

    async def schedule(self, payload: ReminderCreate) -> ActionResult:
        await self.ws_manager.send_json(
            payload.user_id,
            {
                "channel": "reminder_schedule",
                "payload": {
                    "title": payload.title,
                    "trigger_at_iso": payload.trigger_at_iso,
                    "note": payload.note,
                },
            },
        )
        return ActionResult(
            success=True, action="set_reminder", message=f"Reminder set for {payload.trigger_at_iso}"
        )

