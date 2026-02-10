import pytest
import numpy as np
from src.services.monte_carlo_service import SimulationParameter, MonteCarloSimulator

def test_monte_carlo_simulation_run():
    monte_carlo_simulator = MonteCarloSimulator(num_simulations=1000)
    # Setup parameters
    param1 = SimulationParameter(name="Revenue", distribution="normal", mean=100000, std_dev=10000)
    param2 = SimulationParameter(name="Cost", distribution="uniform", min_val=50000, max_val=70000)
    
    monte_carlo_simulator.add_parameter(param1)
    monte_carlo_simulator.add_parameter(param2)
    
    # Define formula: Profit = Revenue - Cost
    def profit_formula(inputs):
        return inputs["Revenue"] - inputs["Cost"]
    
    monte_carlo_simulator.run(profit_formula)
    
    stats = monte_carlo_simulator.get_statistics()
    
    assert stats["num_simulations"] == 1000
    assert stats["mean"] > 0
    assert "percentile_5" in stats
    assert "percentile_95" in stats

def test_lognormal_distribution():
    monte_carlo_simulator = MonteCarloSimulator(num_simulations=1000)
    param = SimulationParameter(name="Asset", distribution="lognormal", mean=100, std_dev=20)
    monte_carlo_simulator.add_parameter(param)
    
    monte_carlo_simulator.run(lambda x: x["Asset"])
    stats = monte_carlo_simulator.get_statistics()
    
    # Lognormal should perform reasonable approximation of mean
    assert 90 < stats["mean"] < 110
    assert stats["minimum"] > 0  # Lognormal can't be negative

def test_missing_run_error():
    monte_carlo_simulator = MonteCarloSimulator(num_simulations=1000)
    with pytest.raises(ValueError):
        monte_carlo_simulator.get_statistics()
