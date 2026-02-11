/**
 * Options Pricing Engine — Black-Scholes Model
 * 
 * Call/Put pricing, Greeks (Delta, Gamma, Theta, Vega, Rho), Put-Call Parity.
 */

import { normalCDF, normalPDF } from "./var-engine";

export interface OptionsInput {
    spotPrice: number;         // S
    strikePrice: number;       // K
    timeToExpiry: number;      // T (years)
    riskFreeRate: number;      // r
    volatility: number;        // σ
    dividendYield?: number;    // q
    optionType: "call" | "put";
}

export interface OptionsResult {
    price: number;
    delta: number;
    gamma: number;
    theta: number;        // per day
    vega: number;         // per 1% vol change
    rho: number;          // per 1% rate change
    intrinsicValue: number;
    timeValue: number;
    d1: number;
    d2: number;
    putCallParity: { callPrice: number; putPrice: number };
}

export function calculateBlackScholes(input: OptionsInput): OptionsResult {
    const { spotPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma, dividendYield: q = 0, optionType } = input;

    if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) {
        throw new Error("S, K, T, σ must all be positive.");
    }

    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;

    const expQT = Math.exp(-q * T);
    const expRT = Math.exp(-r * T);

    // Prices
    const callPrice = S * expQT * normalCDF(d1) - K * expRT * normalCDF(d2);
    const putPrice = K * expRT * normalCDF(-d2) - S * expQT * normalCDF(-d1);

    const price = optionType === "call" ? callPrice : putPrice;

    // Greeks
    const nd1 = normalPDF(d1);

    // Delta
    const deltaCall = expQT * normalCDF(d1);
    const deltaPut = expQT * (normalCDF(d1) - 1);
    const delta = optionType === "call" ? deltaCall : deltaPut;

    // Gamma (same for call and put)
    const gamma = (expQT * nd1) / (S * sigma * sqrtT);

    // Theta (per year, we convert to per day by dividing by 365)
    const thetaCall = (-(S * expQT * nd1 * sigma) / (2 * sqrtT)
        + q * S * expQT * normalCDF(d1)
        - r * K * expRT * normalCDF(d2));
    const thetaPut = (-(S * expQT * nd1 * sigma) / (2 * sqrtT)
        - q * S * expQT * normalCDF(-d1)
        + r * K * expRT * normalCDF(-d2));
    const theta = (optionType === "call" ? thetaCall : thetaPut) / 365;

    // Vega (per 1% change, so divide by 100)
    const vega = S * expQT * nd1 * sqrtT / 100;

    // Rho (per 1% change)
    const rhoCall = K * T * expRT * normalCDF(d2) / 100;
    const rhoPut = -K * T * expRT * normalCDF(-d2) / 100;
    const rho = optionType === "call" ? rhoCall : rhoPut;

    // Intrinsic & Time Value
    const intrinsicCall = Math.max(0, S - K);
    const intrinsicPut = Math.max(0, K - S);
    const intrinsicValue = optionType === "call" ? intrinsicCall : intrinsicPut;
    const timeValue = price - intrinsicValue;

    return {
        price: r4(price),
        delta: r4(delta),
        gamma: r6(gamma),
        theta: r4(theta),
        vega: r4(vega),
        rho: r4(rho),
        intrinsicValue: r2(intrinsicValue),
        timeValue: r4(timeValue),
        d1: r4(d1),
        d2: r4(d2),
        putCallParity: { callPrice: r4(callPrice), putPrice: r4(putPrice) },
    };
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function r6(v: number): number { return Math.round(v * 1000000) / 1000000; }
