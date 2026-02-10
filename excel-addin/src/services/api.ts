import axios from "axios";

// Helper to get base URL
const BASE_URL = "http://localhost:8000/api/v1"; // Changed to http for local docker

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// --- Types ---

export interface VaRRequest {
    portfolio_value: number;
    confidence_level: number;
    time_horizon: number;
    method: "historical" | "parametric" | "monte_carlo";
    returns: number[];
}

export interface MertonRequest {
    asset_value: number;
    debt_face_value: number;
    risk_free_rate: number;
    volatility: number;
    time_to_maturity: number;
}

export interface SensitivityRequest {
    base_inputs: any;
    target_parameter: string;
    min_value: number;
    max_value: number;
    steps: number;
}

export interface SimulationRequest {
    num_simulations: number;
    parameters: any[];
    // and other fields as needed
}

export const ApiService = {
    healthCheck: async () => {
        const response = await apiClient.get("/health");
        return response.data;
    },

    calculateVaR: async (data: VaRRequest) => {
        const response = await apiClient.post("/var/calculate", data);
        return response.data;
    },

    calculateMerton: async (data: MertonRequest) => {
        const response = await apiClient.post("/credit-risk/merton", data);
        return response.data;
    },

    // ... (previous methods)

    calculateCapitalBudgeting: async (data: CapitalBudgetingRequest) => {
        const response = await apiClient.post("/capital-budgeting/calculate", data);
        return response.data;
    }
};

export interface CapitalBudgetingRequest {
    rate: number;
    cash_flows: number[];
}
