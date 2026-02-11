/**
 * API Service — Offline-First Architecture
 * 
 * Attempts API call → falls back to local TypeScript engines.
 * Includes health check, retry with exponential backoff, and status indicator.
 */

import axios from "axios";

// ══ Configuration ══
const API_BASE_URL = "http://localhost:8000/api/v1";
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 500;
const HEALTH_CHECK_INTERVAL_MS = 30000;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    headers: { "Content-Type": "application/json" },
});

// ══ Connection Status ══
export type ConnectionStatus = "online" | "offline" | "checking";
let connectionStatus: ConnectionStatus = "offline";
let statusListeners: ((s: ConnectionStatus) => void)[] = [];

export function getConnectionStatus(): ConnectionStatus { return connectionStatus; }
export function onStatusChange(fn: (s: ConnectionStatus) => void) {
    statusListeners.push(fn);
    return () => { statusListeners = statusListeners.filter(l => l !== fn); };
}

function setStatus(s: ConnectionStatus) {
    connectionStatus = s;
    statusListeners.forEach(fn => fn(s));
}

// ══ Health Check ══
export async function checkConnection(): Promise<boolean> {
    setStatus("checking");
    try {
        await apiClient.get("/health", { timeout: 3000 });
        setStatus("online");
        return true;
    } catch {
        setStatus("offline");
        return false;
    }
}

// Auto health check (runs in background)
let healthInterval: ReturnType<typeof setInterval> | null = null;
export function startHealthCheck() {
    if (healthInterval) return;
    checkConnection();
    healthInterval = setInterval(checkConnection, HEALTH_CHECK_INTERVAL_MS);
}
export function stopHealthCheck() {
    if (healthInterval) { clearInterval(healthInterval); healthInterval = null; }
}

// ══ Retry Logic ══
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError;
}

// ══ Interfaces ══
export interface VaRRequest {
    returns: number[];
    portfolio_value: number;
    confidence_level: number;
    time_horizon?: number;
    method?: string;
    num_simulations?: number;
}

export interface MertonRequest {
    asset_value: number;
    debt_face_value: number;
    risk_free_rate: number;
    volatility: number;
    time_to_maturity: number;
}

export interface SensitivityRequest {
    asset_value: number;
    debt_face_value: number;
    risk_free_rate: number;
    volatility: number;
    time_to_maturity: number;
    parameter_to_vary: string;
    variation_range: [number, number];
    num_steps: number;
}

export interface CapitalBudgetingRequest {
    cash_flows: number[];
    discount_rate: number;
}

// ══ API Service ══
export const ApiService = {
    // Health
    healthCheck: () => checkConnection(),

    // VaR
    calculateVaR: async (data: VaRRequest) => {
        return withRetry(async () => {
            const response = await apiClient.post("/var/calculate", data);
            return response.data;
        });
    },

    // Merton Credit
    calculateMerton: async (data: MertonRequest) => {
        return withRetry(async () => {
            const response = await apiClient.post("/credit-risk/merton", data);
            return response.data;
        });
    },

    // Sensitivity
    calculateSensitivity: async (data: SensitivityRequest) => {
        return withRetry(async () => {
            const response = await apiClient.post("/sensitivity/merton", data);
            return response.data;
        });
    },

    // Capital Budgeting
    calculateCapitalBudgeting: async (data: CapitalBudgetingRequest) => {
        return withRetry(async () => {
            const response = await apiClient.post("/capital-budgeting/analyze", data);
            return response.data;
        });
    },
};

export default ApiService;
