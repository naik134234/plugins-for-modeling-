import pytest
from typing import Generator
from fastapi.testclient import TestClient

from src.api.main import app
from src.services.var_service import ValueAtRiskCalculator
from src.services.monte_carlo_service import MonteCarloSimulator

@pytest.fixture(scope="module")
def client() -> Generator:
    with TestClient(app) as c:
        yield c

@pytest.fixture
def var_calculator():
    return ValueAtRiskCalculator(confidence_level=0.95)

@pytest.fixture
def monte_carlo_simulator():
    return MonteCarloSimulator(num_simulations=1000)

@pytest.fixture
def sample_returns():
    # Generate some simple normal returns for testing
    import numpy as np
    np.random.seed(42)
    return np.random.normal(0.001, 0.02, 100).tolist()
