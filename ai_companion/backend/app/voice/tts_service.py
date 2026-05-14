from __future__ import annotations

import httpx

from app.utils.config import settings


class TTSService:
    async def synthesize(self, text: str) -> bytes | None:
        if not settings.elevenlabs_api_key:
            return None

        headers = {
            "xi-api-key": settings.elevenlabs_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.content

