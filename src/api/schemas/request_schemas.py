from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, EmailStr, validator

from src.models.database import ModelType, TaskStatus


# --- Authentication ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# --- Risk Models ---
class VaRRequest(BaseModel):
    portfolio_value: float = Field(..., gt=0)
    confidence_level: float = Field(0.95, ge=0.01, le=0.999)
    time_horizon: int = Field(1, ge=1)
    method: str = Field("historical", pattern="^(historical|parametric|monte_carlo)$")
    returns: List[float] = Field(..., min_items=30)
    ewma_lambda: Optional[float] = Field(0.94, ge=0.8, le=0.99)
    num_simulations: Optional[int] = Field(10000, ge=1000, le=100000)


class SimulationParameterSchema(BaseModel):
    name: str
    distribution: str = Field(..., pattern="^(normal|lognormal|uniform|triangular|pert)$")
    mean: Optional[float] = None
    std_dev: Optional[float] = None
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    mode_val: Optional[float] = None


class MonteCarloRequest(BaseModel):
    num_simulations: int = Field(10000, ge=1000, le=100000)
    parameters: List[SimulationParameterSchema]
    # In a real app, the output formula would likely be defined by a model ID or script
    # For this simplified version, we might accept a string formula or ID
    model_id: Optional[str] = None
