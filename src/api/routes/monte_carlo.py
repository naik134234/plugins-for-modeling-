from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from src.api.schemas.request_schemas import MonteCarloRequest, SimulationParameterSchema
from src.api.schemas.response_schemas import MonteCarloResponse
from src.services.monte_carlo_service import MonteCarloSimulator, SimulationParameter

router = APIRouter()

@router.post("/simulate", response_model=MonteCarloResponse)
def run_simulation(
    request: MonteCarloRequest,
    # current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Run a Monte Carlo simulation based on provided parameters.
    """
    try:
        simulator = MonteCarloSimulator(num_simulations=request.num_simulations)
        
        # Add parameters to simulator
        for param_schema in request.parameters:
            param = SimulationParameter(
                name=param_schema.name,
                distribution=param_schema.distribution,
                mean=param_schema.mean,
                std_dev=param_schema.std_dev,
                min_val=param_schema.min_val,
                max_val=param_schema.max_val,
                mode_val=param_schema.mode_val
            )
            simulator.add_parameter(param)
        
        # Define output formula (simplified for now - sum of all inputs)
        # In a real scenario, this would be dynamic or selected via model_id
        def default_formula(inputs):
            # Sum up all input arrays
            return sum(inputs.values())
        
        # Run simulation
        simulator.run(default_formula)
        
        return {
            "stats": simulator.get_statistics(),
            "histogram": simulator.get_histogram_data()
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
