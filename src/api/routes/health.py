from typing import Dict
from fastapi import APIRouter

from config import settings

router = APIRouter()

@router.get("/")
def health_check() -> Dict[str, str]:
    """
    Health check endpoint.
    """
    return {
        "status": "ok",
        "app_name": settings.api_title,
        "version": settings.api_version,
        "environment": settings.environment
    }
