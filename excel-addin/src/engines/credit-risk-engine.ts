/**
 * Credit Risk Engine — Merton Structural Model
 * 
 * Calculates:
 * - Probability of Default (PD) via N(-d2)
 * - Distance to Default (DD)
 * - Equity Value (call option on assets)
 * - Debt Value
 * - Implied Credit Spread
 */

import { normalCDF } from "./var-engine";

export interface MertonInput {
    assetValue: number;
    debtFaceValue: number;
    riskFreeRate: number;
    volatility: number;
    timeToMaturity: number;
}

export interface MertonResult {
    probabilityOfDefault: number;
    distanceToDefault: number;
    equityValue: number;
    debtValue: number;
    impliedCreditSpread: number;
    d1: number;
    d2: number;
}

export function calculateMerton(input: MertonInput): MertonResult {
    const { assetValue: V, debtFaceValue: D, riskFreeRate: r, volatility: sigma, timeToMaturity: T } = input;

    if (V <= 0 || D < 0 || T <= 0 || sigma <= 0) {
        throw new Error("Asset value, time, and volatility must be positive.");
    }

    const sqrtT = Math.sqrt(T);
    const numerator = Math.log(V / D) + (r + 0.5 * sigma * sigma) * T;
    const denominator = sigma * sqrtT;

    const d1 = numerator / denominator;
    const d2 = d1 - denominator;

    const probabilityOfDefault = normalCDF(-d2);
    const distanceToDefault = d2;

    const equityValue = V * normalCDF(d1) - D * Math.exp(-r * T) * normalCDF(d2);
    const debtValue = V - equityValue;

    const impliedCreditSpread = -(1 / T) * Math.log(debtValue / D) - r;

    return {
        probabilityOfDefault: round(probabilityOfDefault, 6),
        distanceToDefault: round(distanceToDefault, 4),
        equityValue: round(equityValue, 2),
        debtValue: round(debtValue, 2),
        impliedCreditSpread: round(impliedCreditSpread, 6),
        d1: round(d1, 4),
        d2: round(d2, 4),
    };
}

function round(v: number, d: number): number {
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
}
