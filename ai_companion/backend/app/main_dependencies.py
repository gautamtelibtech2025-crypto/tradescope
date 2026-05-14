from __future__ import annotations

from app.actions.action_router import ActionRouter
from app.actions.intent_detector import IntentDetector
from app.ai.conversation_engine import ConversationEngine
from app.ai.model_manager import AIModelManager
from app.memory.repository import MemoryRepository
from app.permissions.permission_manager import PermissionManager
from app.reminders.reminder_engine import ReminderEngine
from app.services.android_device_controller import AndroidDeviceController
from app.services.contact_call_service import ContactCallService
from app.services.media_control_service import MediaControlService
from app.services.notification_service import NotificationService
from app.suggestions.suggestion_engine import SuggestionEngine
from app.utils.config import settings
from app.voice.tts_service import TTSService
from app.websocket.connection_manager import ConnectionManager

ws_manager = ConnectionManager()
memory_repo = MemoryRepository(settings.database_url)
intent_detector = IntentDetector()
suggestion_engine = SuggestionEngine()
model_manager = AIModelManager()
conversation_engine = ConversationEngine(model_manager)
tts_service = TTSService()
permission_manager = PermissionManager()
device_controller = AndroidDeviceController(ws_manager)
media_service = MediaControlService(ws_manager)
contact_service = ContactCallService(ws_manager)
notification_service = NotificationService(ws_manager)
reminder_engine = ReminderEngine(ws_manager)
action_router = ActionRouter(
    device_controller=device_controller,
    media_service=media_service,
    contact_service=contact_service,
    notification_service=notification_service,
    reminder_engine=reminder_engine,
)


def get_ws_manager() -> ConnectionManager:
    return ws_manager


def get_memory_repository() -> MemoryRepository:
    return memory_repo


def get_intent_detector() -> IntentDetector:
    return intent_detector


def get_suggestion_engine() -> SuggestionEngine:
    return suggestion_engine


def get_conversation_engine() -> ConversationEngine:
    return conversation_engine


def get_tts_service() -> TTSService:
    return tts_service


def get_permission_manager() -> PermissionManager:
    return permission_manager


def get_reminder_engine() -> ReminderEngine:
    return reminder_engine


def get_action_router() -> ActionRouter:
    return action_router

