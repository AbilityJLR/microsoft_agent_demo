from fastapi import APIRouter
from services.ai_services import ai

router = APIRouter()

@router.get("/users/", tags=["users"])
async def read_users():
    return {"message": "Hello World"}

@router.get("/ai/", tags=["ai"])
async def read_ai():
    return ai()