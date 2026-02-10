from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.services.capital_budgeting_service import CapitalBudgetingService

router = APIRouter()

class CapitalBudgetingRequest(BaseModel):
    rate: float
    cash_flows: List[float]

class CapitalBudgetingResponse(BaseModel):
    npv: float
    irr: Optional[float]
    payback_period: float
    profitability_index: float

@router.post("/calculate", response_model=CapitalBudgetingResponse)
async def calculate_capital_budgeting(request: CapitalBudgetingRequest):
    """
    Calculate Capital Budgeting metrics: NPV, IRR, Payback Period, PI.
    """
    service = CapitalBudgetingService()
    try:
        npv = service.calculate_npv(request.rate, request.cash_flows)
        # Try importing numpy_financial internally or use a simpler method
        # for now defaulting IRR to simple if package missing, but we will add it.
        try:
             import numpy_financial as npf
             irr = float(npf.irr(request.cash_flows))
        except ImportError:
             irr = None # Indicate missing dependency or handle otherwise

        payback = service.calculate_payback_period(request.cash_flows)
        pi = service.calculate_profitability_index(request.rate, request.cash_flows)
        
        return {
            "npv": round(npv, 2),
            "irr": round(irr, 6) if irr is not None else None,
            "payback_period": round(payback, 2),
            "profitability_index": round(pi, 4)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
