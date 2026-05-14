from __future__ import annotations


class PermissionManager:
    REQUIRED_PERMISSIONS = [
        "RECORD_AUDIO",
        "POST_NOTIFICATIONS",
        "CALL_PHONE",
        "READ_CONTACTS",
        "READ_PHONE_STATE",
        "SYSTEM_ALERT_WINDOW",
        "BIND_ACCESSIBILITY_SERVICE",
        "BIND_NOTIFICATION_LISTENER_SERVICE",
    ]

    def list_required(self) -> list[str]:
        return self.REQUIRED_PERMISSIONS

