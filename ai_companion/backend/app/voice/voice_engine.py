from __future__ import annotations

from app.voice.stt_service import STTService
from app.voice.tts_service import TTSService


class VoiceEngine:
    def __init__(self) -> None:
        self.stt = STTService()
        self.tts = TTSService()

