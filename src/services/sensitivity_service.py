from typing import List, Dict, Callable
import numpy as np
from src.core.logging_config import LoggerMixin

class SensitivityAnalysisService(LoggerMixin):
    """
    Performs sensitivity analysis by varying input parameters and observing output changes.
    """
    
    def one_way_sensitivity(
        self,
        base_inputs: Dict[str, float],
        target_param: str,
        param_range: List[float],
        model_function: Callable[[Dict[str, float]], float]
    ) -> Dict[str, List[float]]:
        """
        Vary one parameter while keeping others constant.
        
        Args:
            base_inputs: Dictionary of base case input values
            target_param: Name of the parameter to vary
            param_range: List of values to test for the target parameter
            model_function: Callback function that runs the model (returns a single metric)
        """
        try:
            results = []
            
            for val in param_range:
                # Create a copy of inputs to avoid side effects
                current_inputs = base_inputs.copy()
                current_inputs[target_param] = val
                
                # Run the model
                output = model_function(current_inputs)
                results.append(output)
            
            return {
                "parameter": target_param,
                "values": param_range,
                "outputs": results,
                "percentage_change": [
                    ((r - results[0]) / results[0]) * 100 if results[0] != 0 else 0 
                    for r in results
                ]
            }
        except Exception as e:
            self.logger.error(f"Error in Sensitivity Analysis: {str(e)}")
            raise

    def calculate_elasticity(
        self,
        base_inputs: Dict[str, float],
        target_param: str,
        delta_pct: float,
        model_function: Callable[[Dict[str, float]], float]
    ) -> float:
        """
        Calculate elasticity: % change in output / % change in input.
        """
        base_output = model_function(base_inputs)
        
        # Perturb input
        perturbed_inputs = base_inputs.copy()
        perturbed_inputs[target_param] *= (1 + delta_pct)
        
        new_output = model_function(perturbed_inputs)
        
        pct_change_output = (new_output - base_output) / base_output
        
        return pct_change_output / delta_pct
