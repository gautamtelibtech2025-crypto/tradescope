from __future__ import annotations

from app.utils.config import settings


class AIModelManager:
    def __init__(self) -> None:
        self.default_provider = "openai"
        self.default_model = settings.openai_chat_model

    def choose_model(self, complexity: str = "normal") -> tuple[str, str]:
        if complexity == "high":
            return self.default_provider, self.default_model
        return self.default_provider, self.default_model

