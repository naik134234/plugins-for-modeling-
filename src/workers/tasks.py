from typing import Dict, Any, List
from celery.utils.log import get_task_logger

from src.workers.celery_app import celery_app
from src.services.var_service import ValueAtRiskCalculator
from src.services.monte_carlo_service import MonteCarloSimulator, SimulationParameter

logger = get_task_logger(__name__)

@celery_app.task(bind=True, max_retries=3)
def calculate_var_task(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Background task to calculate VaR.
    """
    try:
        logger.info(f"Starting VaR calculation task: {self.request.id}")
        
        calculator = ValueAtRiskCalculator(confidence_level=request_data.get("confidence_level", 0.95))
        method = request_data.get("method", "historical")
        
        result = {}
        if method == "historical":
            result = calculator.historical_var(
                returns=request_data["returns"],
                portfolio_value=request_data["portfolio_value"],
                time_horizon=request_data.get("time_horizon", 1)
            )
        elif method == "parametric":
            result = calculator.parametric_var(
                returns=request_data["returns"],
                portfolio_value=request_data["portfolio_value"],
                time_horizon=request_data.get("time_horizon", 1),
                EWMA_lambda=request_data.get("ewma_lambda", 0.94)
            )
        elif method == "monte_carlo":
            result = calculator.monte_carlo_var(
                returns=request_data["returns"],
                portfolio_value=request_data["portfolio_value"],
                time_horizon=request_data.get("time_horizon", 1),
                num_simulations=request_data.get("num_simulations", 10000)
            )
            
        logger.info(f"VaR calculation completed: {self.request.id}")
        return result
        
    except Exception as e:
        logger.error(f"VaR calculation failed: {str(e)}")
        raise self.retry(exc=e, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def run_monte_carlo_task(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Background task to run Monte Carlo simulation.
    """
    try:
        logger.info(f"Starting Monte Carlo simulation task: {self.request.id}")
        
        simulator = MonteCarloSimulator(num_simulations=request_data.get("num_simulations", 10000))
        
        for param_data in request_data.get("parameters", []):
            param = SimulationParameter(
                name=param_data["name"],
                distribution=param_data["distribution"],
                mean=param_data.get("mean"),
                std_dev=param_data.get("std_dev"),
                min_val=param_data.get("min_val"),
                max_val=param_data.get("max_val"),
                mode_val=param_data.get("mode_val")
            )
            simulator.add_parameter(param)
        
        # Default formula for now
        def default_formula(inputs):
            return sum(inputs.values())
        
        simulator.run(default_formula)
        
        result = {
            "stats": simulator.get_statistics(),
            "histogram": simulator.get_histogram_data()
        }
        
        logger.info(f"Monte Carlo simulation completed: {self.request.id}")
        return result
        
    except Exception as e:
        logger.error(f"Monte Carlo simulation failed: {str(e)}")
        raise self.retry(exc=e, countdown=60)
