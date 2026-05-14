from fastapi import APIRouter, Depends

from app.main_dependencies import get_memory_repository

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/{user_id}")
async def get_memory(user_id: str, memory_repo=Depends(get_memory_repository)):
    return {"items": await memory_repo.get_recent_context(user_id, limit=20)}

