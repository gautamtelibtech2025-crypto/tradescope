from __future__ import annotations

import re
from dataclasses import dataclass

from app.models.schemas import IntentResult


@dataclass(frozen=True)
class IntentRule:
    intent: str
    pattern: re.Pattern[str]
    confidence: float


APP_OPEN_PATTERN = re.compile(
    r"\b(open|launch|start|khol|chalu)\s+(?P<app>[a-zA-Z0-9 _-]+)", re.IGNORECASE
)
APP_CLOSE_PATTERN = re.compile(
    r"\b(close|stop|band|quit)\s+(?P<app>[a-zA-Z0-9 _-]+)", re.IGNORECASE
)
CALL_PATTERN = re.compile(r"\b(call|dial|phone|phone lagao)\s+(?P<name>[a-zA-Z0-9 _-]+)", re.IGNORECASE)
MESSAGE_PATTERN = re.compile(
    r"\b(message|text|msg|send message)\s+(?P<name>[a-zA-Z0-9 _-]+)", re.IGNORECASE
)
REMINDER_PATTERN = re.compile(
    r"\b(remind|reminder|yaad dilana|yaad)\b.*\b(?P<time>tomorrow|today|[0-9]{1,2}(:[0-9]{2})?\s?(am|pm)?)",
    re.IGNORECASE,
)


class IntentDetector:
    SIMPLE_KEYWORDS: dict[str, tuple[str, float]] = {
        "play music": ("media_play", 0.98),
        "pause music": ("media_pause", 0.98),
        "increase volume": ("volume_up", 0.98),
        "decrease volume": ("volume_down", 0.98),
        "brightness up": ("brightness_up", 0.95),
        "brightness down": ("brightness_down", 0.95),
        "wifi on": ("wifi_on", 0.93),
        "wifi off": ("wifi_off", 0.93),
        "bluetooth on": ("bluetooth_on", 0.93),
        "bluetooth off": ("bluetooth_off", 0.93),
        "read notifications": ("read_notifications", 0.96),
    }

    def detect(self, text: str) -> IntentResult:
        cleaned = text.strip().lower()

        for key, (intent, confidence) in self.SIMPLE_KEYWORDS.items():
            if key in cleaned:
                return IntentResult(intent=intent, confidence=confidence)

        if match := APP_OPEN_PATTERN.search(cleaned):
            return IntentResult(
                intent="open_app",
                confidence=0.97,
                entities={"app_name": match.group("app").strip()},
            )

        if match := APP_CLOSE_PATTERN.search(cleaned):
            return IntentResult(
                intent="close_app",
                confidence=0.92,
                entities={"app_name": match.group("app").strip()},
            )

        if match := CALL_PATTERN.search(cleaned):
            return IntentResult(
                intent="call_contact",
                confidence=0.95,
                entities={"contact_name": match.group("name").strip()},
            )

        if match := MESSAGE_PATTERN.search(cleaned):
            return IntentResult(
                intent="send_message",
                confidence=0.94,
                entities={"contact_name": match.group("name").strip()},
            )

        if match := REMINDER_PATTERN.search(cleaned):
            return IntentResult(
                intent="set_reminder",
                confidence=0.9,
                entities={"time_hint": match.group("time")},
            )

        return IntentResult(intent="conversation", confidence=0.45, entities={"raw_text": text})

