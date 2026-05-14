from fastapi import APIRouter, Depends

from app.main_dependencies import get_permission_manager

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.get("")
async def list_permissions(permission_manager=Depends(get_permission_manager)):
    return {"required": permission_manager.list_required()}

