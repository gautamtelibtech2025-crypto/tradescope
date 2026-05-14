from __future__ import annotations

import httpx

from app.utils.config import settings


class STTService:
    async def transcribe(self, audio_bytes: bytes, filename: str = "speech.wav") -> str:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured for Whisper STT")

        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        files = {"file": (filename, audio_bytes, "audio/wav")}
        data = {"model": settings.openai_whisper_model}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.openai_base_url}/audio/transcriptions",
                headers=headers,
                files=files,
                data=data,
            )
            response.raise_for_status()
            return response.json()["text"]

