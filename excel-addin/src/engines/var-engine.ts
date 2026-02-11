/**
 * Value at Risk (VaR) Engine
 * 
 * Implements three VaR methodologies:
 * 1. Historical VaR
 * 2. Parametric (Variance-Covariance) VaR with EWMA
 * 3. Monte Carlo VaR
 * 
 * All include Expected Shortfall (CVaR).
 */

// Standard Normal CDF approximation (Abramowitz & Stegun)
function normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

// Standard Normal PDF
function normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Inverse Normal CDF (Rational Approximation - Peter Acklam)
export function normalInvCDF(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    const a = [
        -3.969683028665376e+01, 2.209460984245205e+02,
        -2.759285104469687e+02, 1.383577518672690e+02,
        -3.066479806614716e+01, 2.506628277459239e+00
    ];
    const b = [
        -5.447609879822406e+01, 1.615858368580409e+02,
        -1.556989798598866e+02, 6.680131188771972e+01,
        -1.328068155288572e+01
    ];
    const c = [
        -7.784894002430293e-03, -3.223964580411365e-01,
        -2.400758277161838e+00, -2.549732539343734e+00,
        4.374664141464968e+00, 2.938163982698783e+00
    ];
    const d = [
        7.784695709041462e-03, 3.224671290700398e-01,
        2.445134137142996e+00, 3.754408661907416e+00
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;

    if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
}

// Box-Muller for generating normal random numbers
function randomNormal(mean = 0, stdDev = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}

export interface VaRInput {
    returns: number[];
    portfolioValue: number;
    confidenceLevel: number;
    timeHorizon: number;
    method: "historical" | "parametric" | "monte_carlo";
    numSimulations?: number;
    ewmaLambda?: number;
}

export interface VaRResult {
    varMethod: string;
    confidenceLevel: string;
    varPercentage: number;
    varAbsolute: number;
    expectedShortfall: number;
    timeHorizonDays: number;
    dataPointsUsed: number;
    dailyVolatility?: number;
    annualizedVolatility?: number;
    numSimulations?: number;
    percentile5?: number;
    percentile1?: number;
    avgSimulatedReturn?: number;
}

export function calculateVaR(input: VaRInput): VaRResult {
    const alpha = 1 - input.confidenceLevel;

    switch (input.method) {
        case "historical":
            return historicalVaR(input.returns, input.portfolioValue, input.confidenceLevel, alpha, input.timeHorizon);
        case "parametric":
            return parametricVaR(input.returns, input.portfolioValue, input.confidenceLevel, alpha, input.timeHorizon, input.ewmaLambda ?? 0.94);
        case "monte_carlo":
            return monteCarloVaR(input.returns, input.portfolioValue, input.confidenceLevel, alpha, input.timeHorizon, input.numSimulations ?? 10000);
        default:
            throw new Error(`Unknown VaR method: ${input.method}`);
    }
}

function historicalVaR(
    returns: number[], portfolioValue: number, confidence: number, alpha: number, timeHorizon: number
): VaRResult {
    if (returns.length === 0) throw new Error("Returns data cannot be empty");

    const sorted = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(alpha * sorted.length);
    const varPct = sorted[varIndex] * Math.sqrt(timeHorizon);
    const varAbsolute = portfolioValue * Math.abs(varPct);

    // Expected Shortfall (CVaR)
    const tailLosses = sorted.slice(0, varIndex);
    const es = tailLosses.length > 0
        ? Math.abs(tailLosses.reduce((s, v) => s + v, 0) / tailLosses.length) * portfolioValue * Math.sqrt(timeHorizon)
        : varAbsolute;

    return {
        varMethod: "Historical",
        confidenceLevel: `${confidence * 100}%`,
        varPercentage: round(Math.abs(varPct) * 100, 4),
        varAbsolute: round(varAbsolute, 2),
        expectedShortfall: round(es, 2),
        timeHorizonDays: timeHorizon,
        dataPointsUsed: returns.length,
    };
}

function parametricVaR(
    returns: number[], portfolioValue: number, confidence: number, alpha: number, timeHorizon: number, ewmaLambda: number
): VaRResult {
    if (returns.length === 0) throw new Error("Returns data cannot be empty");

    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;

    // EWMA volatility
    let volatility: number;
    if (ewmaLambda > 0 && ewmaLambda < 1) {
        const n = returns.length;
        let weightedVariance = 0;
        let weightSum = 0;
        for (let i = 0; i < n; i++) {
            const w = Math.pow(ewmaLambda, n - 1 - i);
            weightedVariance += w * Math.pow(returns[i] - mean, 2);
            weightSum += w;
        }
        volatility = Math.sqrt(weightedVariance / weightSum);
    } else {
        const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returns.length;
        volatility = Math.sqrt(variance);
    }

    const annualizedVol = volatility * Math.sqrt(252);
    const volAdjusted = volatility * Math.sqrt(timeHorizon);
    const zScore = normalInvCDF(alpha);
    const varPct = Math.max(0, -(mean * timeHorizon + zScore * volAdjusted));
    const varAbsolute = portfolioValue * varPct;

    // ES under normal
    const esZTerm = normalPDF(zScore) / alpha;
    const esPct = Math.max(0, -(mean * timeHorizon + volAdjusted * esZTerm));
    const es = portfolioValue * esPct;

    return {
        varMethod: "Parametric (Normal)",
        confidenceLevel: `${confidence * 100}%`,
        dailyVolatility: round(volatility * 100, 4),
        annualizedVolatility: round(annualizedVol * 100, 2),
        varPercentage: round(varPct * 100, 4),
        varAbsolute: round(varAbsolute, 2),
        expectedShortfall: round(es, 2),
        timeHorizonDays: timeHorizon,
        dataPointsUsed: returns.length,
    };
}

function monteCarloVaR(
    returns: number[], portfolioValue: number, confidence: number, alpha: number, timeHorizon: number, numSimulations: number
): VaRResult {
    if (returns.length === 0) throw new Error("Returns data cannot be empty");

    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const simulated: number[] = [];
    for (let i = 0; i < numSimulations; i++) {
        simulated.push(randomNormal(mean, stdDev) * Math.sqrt(timeHorizon));
    }
    simulated.sort((a, b) => a - b);

    const varIndex = Math.floor(alpha * numSimulations);
    const varPct = Math.abs(simulated[varIndex]);
    const varAbsolute = portfolioValue * varPct;

    const tailLosses = simulated.slice(0, varIndex);
    const es = tailLosses.length > 0
        ? Math.abs(tailLosses.reduce((s, v) => s + v, 0) / tailLosses.length) * portfolioValue
        : varAbsolute;

    return {
        varMethod: "Monte Carlo",
        confidenceLevel: `${confidence * 100}%`,
        varPercentage: round(varPct * 100, 4),
        varAbsolute: round(varAbsolute, 2),
        expectedShortfall: round(es, 2),
        timeHorizonDays: timeHorizon,
        dataPointsUsed: returns.length,
        numSimulations,
        percentile5: round(percentile(simulated, 5) * 100, 2),
        percentile1: round(percentile(simulated, 1) * 100, 2),
        avgSimulatedReturn: round((simulated.reduce((s, v) => s + v, 0) / simulated.length) * 100, 2),
    };
}

function percentile(sorted: number[], pct: number): number {
    const idx = Math.floor(pct / 100 * sorted.length);
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

export { normalCDF, normalPDF, randomNormal };
