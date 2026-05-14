from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect

from app.api.routes import assistant, health, memory, permissions, reminders
from app.automation.browser_automation import BrowserAutomationEngine
from app.main_dependencies import get_memory_repository, get_ws_manager
from app.utils.config import settings
from app.voice.stt_service import STTService


@asynccontextmanager
async def lifespan(_: FastAPI):
    memory_repo = get_memory_repository()
    await memory_repo.connect()
    yield
    await memory_repo.disconnect()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(health.router, prefix="/api/v1")
app.include_router(assistant.router, prefix="/api/v1")
app.include_router(reminders.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")
app.include_router(permissions.router, prefix="/api/v1")

stt_service = STTService()
browser_engine = BrowserAutomationEngine()


@app.post("/api/v1/voice/transcribe")
async def transcribe(file: UploadFile):
    audio = await file.read()
    text = await stt_service.transcribe(audio, filename=file.filename or "speech.wav")
    return {"text": text}


@app.get("/api/v1/automation/search")
async def automation_search(query: str):
    return {"results": await browser_engine.google_search(query)}


@app.websocket("/ws/assistant/{user_id}")
async def assistant_socket(websocket: WebSocket, user_id: str):
    manager = get_ws_manager()
    await manager.connect(user_id, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

