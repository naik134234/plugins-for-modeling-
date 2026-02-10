from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from src.api.schemas.request_schemas import VaRRequest
from src.api.schemas.response_schemas import VaRResponse
from src.services.var_service import ValueAtRiskCalculator

router = APIRouter()

@router.post("/calculate", response_model=VaRResponse)
def calculate_var(
    request: VaRRequest,
    # current_user: User = Depends(get_current_active_user) # Placeholder dependency
) -> Any:
    """
    Calculate Value at Risk (VaR) for a given portfolio or return series.
    """
    calculator = ValueAtRiskCalculator(confidence_level=request.confidence_level)
    
    if request.method == "historical":
        return calculator.historical_var(
            returns=request.returns,
            portfolio_value=request.portfolio_value,
            time_horizon=request.time_horizon
        )
    elif request.method == "parametric":
        return calculator.parametric_var(
            returns=request.returns,
            portfolio_value=request.portfolio_value,
            time_horizon=request.time_horizon,
            EWMA_lambda=request.ewma_lambda
        )
    elif request.method == "monte_carlo":
        if not request.num_simulations:
            request.num_simulations = 10000
            
        return calculator.monte_carlo_var(
            returns=request.returns,
            portfolio_value=request.portfolio_value,
            time_horizon=request.time_horizon,
            num_simulations=request.num_simulations
        )
    
    raise HTTPException(status_code=400, detail="Invalid calculation method")
