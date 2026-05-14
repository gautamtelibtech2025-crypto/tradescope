from fastapi import APIRouter, Depends

from app.main_dependencies import get_reminder_engine
from app.models.schemas import ReminderCreate

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post("")
async def create_reminder(payload: ReminderCreate, reminder_engine=Depends(get_reminder_engine)):
    return await reminder_engine.schedule(payload)

