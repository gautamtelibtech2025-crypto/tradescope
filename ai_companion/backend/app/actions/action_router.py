from __future__ import annotations

from app.models.schemas import ActionResult, IntentResult, ReminderCreate
from app.reminders.reminder_engine import ReminderEngine
from app.services.android_device_controller import AndroidDeviceController
from app.services.contact_call_service import ContactCallService
from app.services.media_control_service import MediaControlService
from app.services.notification_service import NotificationService


class ActionRouter:
    def __init__(
        self,
        device_controller: AndroidDeviceController,
        media_service: MediaControlService,
        contact_service: ContactCallService,
        notification_service: NotificationService,
        reminder_engine: ReminderEngine,
    ) -> None:
        self.device_controller = device_controller
        self.media_service = media_service
        self.contact_service = contact_service
        self.notification_service = notification_service
        self.reminder_engine = reminder_engine

    async def route(self, user_id: str, intent: IntentResult) -> ActionResult | None:
        if intent.intent == "open_app":
            return await self.device_controller.open_app(user_id, intent.entities.get("app_name", ""))
        if intent.intent == "close_app":
            return await self.device_controller.close_app(user_id, intent.entities.get("app_name", ""))
        if intent.intent == "media_play":
            return await self.media_service.play(user_id)
        if intent.intent == "media_pause":
            return await self.media_service.pause(user_id)
        if intent.intent == "volume_up":
            return await self.device_controller.set_volume(user_id, "up")
        if intent.intent == "volume_down":
            return await self.device_controller.set_volume(user_id, "down")
        if intent.intent == "brightness_up":
            return await self.device_controller.set_brightness(user_id, "up")
        if intent.intent == "brightness_down":
            return await self.device_controller.set_brightness(user_id, "down")
        if intent.intent == "call_contact":
            return await self.contact_service.call_contact(user_id, intent.entities.get("contact_name", ""))
        if intent.intent == "send_message":
            return await self.contact_service.send_message(user_id, intent.entities.get("contact_name", ""))
        if intent.intent == "read_notifications":
            return await self.notification_service.read_notifications(user_id)
        if intent.intent == "set_reminder":
            reminder = ReminderCreate(
                user_id=user_id,
                title="Voice reminder",
                trigger_at_iso=intent.entities.get("time_hint", "today 9 pm"),
            )
            return await self.reminder_engine.schedule(reminder)
        return None

