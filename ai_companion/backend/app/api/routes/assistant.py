from __future__ import annotations

from fastapi import APIRouter, Depends

from app.actions.intent_detector import IntentDetector
from app.main_dependencies import (
    get_action_router,
    get_conversation_engine,
    get_intent_detector,
    get_memory_repository,
    get_suggestion_engine,
    get_tts_service,
)
from app.memory.repository import MemoryRepository
from app.models.schemas import AssistantRequest, AssistantResponse, IntentResult, MemoryItem
from app.suggestions.suggestion_engine import SuggestionEngine
from app.voice.tts_service import TTSService

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/process", response_model=AssistantResponse)
async def process_assistant_request(
    payload: AssistantRequest,
    intent_detector: IntentDetector = Depends(get_intent_detector),
    memory_repo: MemoryRepository = Depends(get_memory_repository),
    suggestion_engine: SuggestionEngine = Depends(get_suggestion_engine),
    tts_service: TTSService = Depends(get_tts_service),
) -> AssistantResponse:
    action_router = get_action_router()
    conversation_engine = get_conversation_engine()

    intent = intent_detector.detect(payload.text)
    action_result = None
    response_text = ""

    if intent.confidence >= 0.85 and intent.intent != "conversation":
        action_result = await action_router.route(payload.user_id, intent)
        response_text = action_result.message if action_result else "Done."
    else:
        memory = await memory_repo.get_recent_context(payload.user_id, limit=8)
        response_text = await conversation_engine.chat(payload.text, memory)
        intent = IntentResult(intent="conversation", confidence=0.7, source="llm")

    suggestions = suggestion_engine.get_suggestions(payload.context)
    if suggestions:
        response_text = f"{response_text}\n\nTip: {suggestions[0]}"

    await memory_repo.write_memory(
        MemoryItem(user_id=payload.user_id, key="last_user_message", value=payload.text, category="conversation")
    )
    await memory_repo.write_memory(
        MemoryItem(user_id=payload.user_id, key="last_assistant_reply", value=response_text, category="conversation")
    )
    await tts_service.synthesize(response_text)

    return AssistantResponse(
        text=response_text,
        intent=intent,
        action_result=action_result,
        memory_written=True,
    )

