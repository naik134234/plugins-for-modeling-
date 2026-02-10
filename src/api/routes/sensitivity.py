from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import numpy as np
from src.services.sensitivity_service import SensitivityAnalysisService
from src.services.credit_risk_service import CreditRiskService, MertonModelInput

router = APIRouter()

class SensitivityRequest(BaseModel):
    base_inputs: Dict[str, float]
    target_parameter: str
    min_value: float
    max_value: float
    steps: int

    class Config:
        schema_extra = {
            "example": {
                "base_inputs": {
                    "asset_value": 100,
                    "debt_face_value": 80,
                    "risk_free_rate": 0.05,
                    "volatility": 0.2,
                    "time_to_maturity": 1.0
                },
                "target_parameter": "asset_value",
                "min_value": 80,
                "max_value": 120,
                "steps": 10
            }
        }

@router.post("/merton")
async def merton_sensitivity(request: SensitivityRequest):
    """
    Perform sensitivity analysis on the Merton Credit Risk Model.
    Varies one input parameter and observes changes in Probability of Default and Equity Value.
    """
    service = SensitivityAnalysisService()
    credit_service = CreditRiskService()
    
    try:
        # Define wrapper function for the model
        def model_wrapper(inputs: Dict[str, float]) -> float:
            merton_input = MertonModelInput(
                asset_value=inputs.get("asset_value"),
                debt_face_value=inputs.get("debt_face_value"),
                risk_free_rate=inputs.get("risk_free_rate"),
                volatility=inputs.get("volatility"),
                time_to_maturity=inputs.get("time_to_maturity")
            )
            result = credit_service.calculate_merton_model(merton_input)
            # Return Probability of Default as the primary metric to track
            return result["probability_of_default"]

        # Generate range
        if request.steps <= 1:
            raise ValueError("Steps must be > 1")
            
        param_range = np.linspace(request.min_value, request.max_value, request.steps).tolist()
        
        # Run analysis
        pd_result = service.one_way_sensitivity(
            base_inputs=request.base_inputs,
            target_param=request.target_parameter,
            param_range=param_range,
            model_function=model_wrapper
        )
        
        return {
            "analysis_type": "Merton Model Sensitivity (Target: PD)",
            "parameter": request.target_parameter,
            "values": pd_result["values"],
            "pd_outputs": pd_result["outputs"],
            "pd_pct_change": pd_result["percentage_change"]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
