from __future__ import annotations

from app.services.notification_service import NotificationService


class NotificationEngine:
    def __init__(self, service: NotificationService) -> None:
        self.service = service

