from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import UUID

from src.models.database import TaskStatus, ModelType


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    
    class Config:
        from_attributes = True


class VaRResponse(BaseModel):
    var_method: str
    confidence_level: str
    var_absolute: float
    var_percentage: float
    expected_shortfall: float
    time_horizon_days: int
    data_points_used: Optional[int] = None
    daily_volatility: Optional[float] = None
    annualized_volatility: Optional[float] = None
    num_simulations: Optional[int] = None


class TaskResponse(BaseModel):
    task_id: str
    status: TaskStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class MonteCarloResponse(BaseModel):
    stats: Dict[str, Any]
    histogram: Optional[Dict[str, Any]] = None
