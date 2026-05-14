from __future__ import annotations

from typing import Protocol


class ChatProvider(Protocol):
    async def chat(self, system_prompt: str, user_text: str) -> str:
        ...


class OpenAIProvider:
    async def chat(self, system_prompt: str, user_text: str) -> str:
        raise NotImplementedError


class ClaudeProvider:
    async def chat(self, system_prompt: str, user_text: str) -> str:
        raise NotImplementedError


class GeminiProvider:
    async def chat(self, system_prompt: str, user_text: str) -> str:
        raise NotImplementedError

