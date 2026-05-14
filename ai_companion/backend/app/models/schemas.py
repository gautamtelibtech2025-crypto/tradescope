from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IntentResult(BaseModel):
    intent: str
    confidence: float
    entities: dict[str, Any] = Field(default_factory=dict)
    source: Literal["deterministic", "llm"] = "deterministic"


class ActionResult(BaseModel):
    success: bool
    action: str
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


class AssistantRequest(BaseModel):
    user_id: str
    text: str
    session_id: str | None = None
    locale: str = "en-IN"
    context: dict[str, Any] = Field(default_factory=dict)


class AssistantResponse(BaseModel):
    text: str
    intent: IntentResult
    action_result: ActionResult | None = None
    memory_written: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReminderCreate(BaseModel):
    user_id: str
    title: str
    trigger_at_iso: str
    note: str = ""


class MemoryItem(BaseModel):
    user_id: str
    key: str
    value: str
    category: str = "preference"
    created_at: datetime = Field(default_factory=datetime.utcnow)

