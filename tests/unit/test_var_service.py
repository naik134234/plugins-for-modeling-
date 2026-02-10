import pytest
import numpy as np
from src.services.var_service import ValueAtRiskCalculator

def test_historical_var_calculation():
    var_calculator = ValueAtRiskCalculator(confidence_level=0.95)
    sample_returns = np.random.normal(0.001, 0.02, 100).tolist()
    
    result = var_calculator.historical_var(
        returns=sample_returns,
        portfolio_value=1000000,
        time_horizon=1
    )
    
    assert "var_absolute" in result
    assert "var_percentage" in result
    assert result["var_absolute"] > 0
    assert result["confidence_level"] == "95.0%"

def test_parametric_var_calculation():
    var_calculator = ValueAtRiskCalculator(confidence_level=0.95)
    sample_returns = np.random.normal(0.001, 0.02, 100).tolist()
    
    result = var_calculator.parametric_var(
        returns=sample_returns,
        portfolio_value=1000000,
        time_horizon=1
    )
    
    assert "var_absolute" in result
    assert "var_percentage" in result
    assert result["var_absolute"] > 0
    assert "annualized_volatility" in result

def test_monte_carlo_var_calculation():
    var_calculator = ValueAtRiskCalculator(confidence_level=0.95)
    sample_returns = np.random.normal(0.001, 0.02, 100).tolist()

    result = var_calculator.monte_carlo_var(
        returns=sample_returns,
        portfolio_value=1000000,
        time_horizon=1,
        num_simulations=1000
    )
    
    assert "var_absolute" in result
    assert "simulated_5th_percentile_return" in result
    assert result["num_simulations"] == 1000

def test_empty_returns_error():
    var_calculator = ValueAtRiskCalculator(confidence_level=0.95)
    with pytest.raises(ValueError):
        var_calculator.historical_var(
            returns=[],
            portfolio_value=1000000
        )
