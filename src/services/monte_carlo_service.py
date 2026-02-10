import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Callable, List, Dict, Any, Optional
from scipy import stats
from src.core.logging_config import LoggerMixin

@dataclass
class SimulationParameter:
    """
    Defines a random variable for Monte Carlo simulation.
    """
    name: str
    distribution: str  # 'normal', 'lognormal', 'uniform', 'triangular', 'pert'
    mean: float = None
    std_dev: float = None
    min_val: float = None
    max_val: float = None
    mode_val: float = None  # For triangular/PERT distributions

class MonteCarloSimulator(LoggerMixin):
    """
    General-purpose Monte Carlo simulation engine.
    Can be used for project risk, portfolio risk, or any probabilistic modeling.
    """
    
    def __init__(self, num_simulations: int = 10000):
        self.num_simulations = num_simulations
        self.results = None
        self.input_parameters = {}
    
    def add_parameter(self, param: SimulationParameter):
        """
        Add a random variable to the simulation.
        """
        self.input_parameters[param.name] = param
        return self
    
    def _generate_samples(self, param: SimulationParameter) -> np.ndarray:
        """
        Generate random samples based on distribution type.
        """
        if param.distribution == 'normal':
            return np.random.normal(param.mean, param.std_dev, self.num_simulations)
        
        elif param.distribution == 'lognormal':
            # Convert mean/std to log-space parameters
            # sigma^2 = ln(1 + (std/mean)^2)
            # mu = ln(mean) - 0.5 * sigma^2
            sigma_sq = np.log(1 + (param.std_dev / param.mean) ** 2)
            mu = np.log(param.mean) - 0.5 * sigma_sq
            sigma = np.sqrt(sigma_sq)
            return np.random.lognormal(mu, sigma, self.num_simulations)
        
        elif param.distribution == 'uniform':
            return np.random.uniform(param.min_val, param.max_val, self.num_simulations)
        
        elif param.distribution == 'triangular':
            return np.random.triangular(
                param.min_val, 
                param.mode_val, 
                param.max_val, 
                self.num_simulations
            )
        
        elif param.distribution == 'pert':
            # PERT distribution (similar to triangular but smoother)
            # Lambda = 4 for standard PERT
            lambda_param = 4
            alpha = 1 + lambda_param * (param.mode_val - param.min_val) / (param.max_val - param.min_val)
            beta = 1 + lambda_param * (param.max_val - param.mode_val) / (param.max_val - param.min_val)
            return (param.max_val - param.min_val) * np.random.beta(alpha, beta, self.num_simulations) + param.min_val
        
        else:
            raise ValueError(f"Unsupported distribution: {param.distribution}")
    
    def run(self, output_formula: Callable[[Dict[str, np.ndarray]], np.ndarray]):
        """
        Run the Monte Carlo simulation.
        
        Args:
            output_formula: Function that takes dictionary of input arrays
                           and returns output array.
        """
        self.logger.info(f"Starting Monte Carlo simulation with {self.num_simulations} iterations")
        
        # Generate samples for all parameters
        samples = {}
        for name, param in self.input_parameters.items():
            samples[name] = self._generate_samples(param)
        
        # Calculate output using the provided formula
        try:
            self.results = output_formula(samples)
            self.logger.info("Simulation completed successfully")
        except Exception as e:
            self.logger.error(f"Simulation failed: {str(e)}")
            raise
        
        return self
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics from simulation results.
        """
        if self.results is None:
            raise ValueError("Run simulation first!")
        
        sorted_results = np.sort(self.results)
        
        stats_dict = {
            "num_simulations": self.num_simulations,
            "mean": round(float(np.mean(self.results)), 2),
            "std_dev": round(float(np.std(self.results)), 2),
            "coefficient_of_variation": round(float(np.std(self.results) / np.mean(self.results) * 100), 2),
            "minimum": round(float(np.min(self.results)), 2),
            "maximum": round(float(np.max(self.results)), 2),
            "range": round(float(np.max(self.results) - np.min(self.results)), 2),
            # Percentiles
            "percentile_5": round(float(np.percentile(self.results, 5)), 2),
            "percentile_10": round(float(np.percentile(self.results, 10)), 2),
            "percentile_25": round(float(np.percentile(self.results, 25)), 2),
            "percentile_50_median": round(float(np.percentile(self.results, 50)), 2),
            "percentile_75": round(float(np.percentile(self.results, 75)), 2),
            "percentile_90": round(float(np.percentile(self.results, 90)), 2),
            "percentile_95": round(float(np.percentile(self.results, 95)), 2),
            # Probability of achieving targets
            "prob_negative": round(float(np.mean(self.results < 0) * 100), 2),
            "prob_greater_than_zero": round(float(np.mean(self.results > 0) * 100), 2),
        }
        
        return stats_dict
    
    def get_percentile(self, percentile: float) -> float:
        """
        Get a specific percentile of results.
        """
        return float(np.percentile(self.results, percentile))
    
    def get_histogram_data(self, num_bins: int = 50) -> Dict:
        """
        Get histogram data for charting.
        """
        hist, bin_edges = np.histogram(self.results, bins=num_bins)
        
        return {
            "bins": [(bin_edges[i] + bin_edges[i+1]) / 2 for i in range(len(bin_edges)-1)],
            "frequencies": hist.tolist(),
            "bin_width": float(bin_edges[1] - bin_edges[0])
        }
