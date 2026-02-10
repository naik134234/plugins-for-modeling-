from fastapi.testclient import TestClient
import pytest

def test_health_check(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_calculate_var_endpoint(client: TestClient):
    payload = {
        "portfolio_value": 1000000,
        "confidence_level": 0.95,
        "time_horizon": 1,
        "method": "historical",
        "returns": [0.01, -0.02, 0.005, 0.03, -0.012, 0.015, -0.005, 0.02, 0.001, -0.015] * 10
    }
    
    response = client.post("/api/v1/var/calculate", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["var_method"] == "Historical"
    assert data["var_absolute"] > 0

def test_calculate_var_invalid_method(client: TestClient):
    payload = {
        "portfolio_value": 1000000,
        "method": "invalid_method",
        "returns": [0.01] * 30
    }
    
    response = client.post("/api/v1/var/calculate", json=payload)
    assert response.status_code == 422  # Validation error from Pydantic
