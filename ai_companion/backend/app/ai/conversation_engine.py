from __future__ import annotations

from typing import Any

import httpx

from app.ai.model_manager import AIModelManager
from app.utils.config import settings


class ConversationEngine:
    SYSTEM_PROMPT = (
        "You are a practical AI companion for Android users. "
        "Respond naturally in Hindi, English, or Hinglish depending on user language. "
        "Keep responses short, helpful, and non-intrusive."
    )

    def __init__(self, model_manager: AIModelManager) -> None:
        self.model_manager = model_manager

    async def chat(self, user_text: str, context: list[dict[str, Any]]) -> str:
        if not settings.openai_api_key:
            return "I am ready, but AI provider keys are missing. Please configure backend environment variables."

        _, model = self.model_manager.choose_model()
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        for item in context[:4]:
            messages.append({"role": "system", "content": f"Memory: {item.get('key')}={item.get('value')}"})
        messages.append({"role": "user", "content": user_text})

        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        payload = {"model": model, "messages": messages, "temperature": 0.4}

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.openai_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

