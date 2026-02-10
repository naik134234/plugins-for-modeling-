from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict
from src.services.credit_risk_service import CreditRiskService, MertonModelInput

router = APIRouter()

class MertonRequest(BaseModel):
    asset_value: float
    debt_face_value: float
    risk_free_rate: float
    volatility: float
    time_to_maturity: float

class MertonResponse(BaseModel):
    probability_of_default: float
    distance_to_default: float
    equity_value: float
    debt_value: float
    implied_credit_spread: float

@router.post("/merton", response_model=MertonResponse)
async def calculate_merton_model(request: MertonRequest):
    """
    Calculate credit risk metrics using the Merton Model.
    """
    service = CreditRiskService()
    try:
        inputs = MertonModelInput(
            asset_value=request.asset_value,
            debt_face_value=request.debt_face_value,
            risk_free_rate=request.risk_free_rate,
            volatility=request.volatility,
            time_to_maturity=request.time_to_maturity
        )
        return service.calculate_merton_model(inputs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")
