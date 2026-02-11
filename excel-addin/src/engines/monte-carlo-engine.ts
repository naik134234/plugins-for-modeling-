/**
 * Monte Carlo Simulation Engine
 * 
 * Supports distributions: Normal, LogNormal, Uniform, Triangular, PERT
 * Produces full statistics + histogram data.
 */

import { randomNormal } from "./var-engine";

export interface SimulationParameter {
    name: string;
    distribution: "normal" | "lognormal" | "uniform" | "triangular" | "pert";
    mean?: number;
    stdDev?: number;
    minVal?: number;
    maxVal?: number;
    modeVal?: number;
}

export interface MCInput {
    numSimulations: number;
    parameters: SimulationParameter[];
    formula?: "sum" | "product" | "npv";
    discountRate?: number;
}

export interface MCStats {
    numSimulations: number;
    mean: number;
    stdDev: number;
    coefficientOfVariation: number;
    minimum: number;
    maximum: number;
    range: number;
    percentile5: number;
    percentile10: number;
    percentile25: number;
    median: number;
    percentile75: number;
    percentile90: number;
    percentile95: number;
    probNegative: number;
    probPositive: number;
}

export interface MCResult {
    stats: MCStats;
    histogram: { bins: number[]; frequencies: number[]; binWidth: number };
}

function generateSamples(param: SimulationParameter, n: number): number[] {
    const samples: number[] = [];

    switch (param.distribution) {
        case "normal":
            for (let i = 0; i < n; i++) samples.push(randomNormal(param.mean ?? 0, param.stdDev ?? 1));
            break;
        case "lognormal": {
            const m = param.mean ?? 1;
            const s = param.stdDev ?? 0.5;
            const sigmaSq = Math.log(1 + (s / m) ** 2);
            const mu = Math.log(m) - 0.5 * sigmaSq;
            const sigma = Math.sqrt(sigmaSq);
            for (let i = 0; i < n; i++) samples.push(Math.exp(randomNormal(mu, sigma)));
            break;
        }
        case "uniform":
            for (let i = 0; i < n; i++) {
                samples.push((param.minVal ?? 0) + Math.random() * ((param.maxVal ?? 1) - (param.minVal ?? 0)));
            }
            break;
        case "triangular":
            for (let i = 0; i < n; i++) {
                samples.push(triangularRandom(param.minVal ?? 0, param.modeVal ?? 0.5, param.maxVal ?? 1));
            }
            break;
        case "pert": {
            const min = param.minVal ?? 0;
            const mode = param.modeVal ?? 0.5;
            const max = param.maxVal ?? 1;
            const lambda = 4;
            const alpha = 1 + lambda * (mode - min) / (max - min);
            const beta = 1 + lambda * (max - mode) / (max - min);
            for (let i = 0; i < n; i++) {
                samples.push((max - min) * betaRandom(alpha, beta) + min);
            }
            break;
        }
    }
    return samples;
}

function triangularRandom(min: number, mode: number, max: number): number {
    const u = Math.random();
    const fc = (mode - min) / (max - min);
    if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

// Simple beta random via Jöhnk's algorithm for small alpha/beta
function betaRandom(alpha: number, beta: number): number {
    // Use gamma ratio method
    const x = gammaRandom(alpha);
    const y = gammaRandom(beta);
    return x / (x + y);
}

function gammaRandom(shape: number): number {
    // Marsaglia and Tsang's method for shape >= 1
    if (shape < 1) {
        return gammaRandom(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        let x: number, v: number;
        do {
            x = randomNormal();
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = Math.random();
        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
}

export function runMonteCarlo(input: MCInput): MCResult {
    const { numSimulations, parameters } = input;

    // Generate samples for each parameter
    const allSamples: Record<string, number[]> = {};
    for (const param of parameters) {
        allSamples[param.name] = generateSamples(param, numSimulations);
    }

    // Apply formula
    const results: number[] = new Array(numSimulations).fill(0);
    const keys = Object.keys(allSamples);

    if (input.formula === "product") {
        for (let i = 0; i < numSimulations; i++) {
            let prod = 1;
            for (const k of keys) prod *= allSamples[k][i];
            results[i] = prod;
        }
    } else if (input.formula === "npv" && input.discountRate !== undefined) {
        const rate = input.discountRate;
        for (let i = 0; i < numSimulations; i++) {
            let npv = 0;
            for (let t = 0; t < keys.length; t++) {
                npv += allSamples[keys[t]][i] / Math.pow(1 + rate, t);
            }
            results[i] = npv;
        }
    } else {
        // Default: sum
        for (let i = 0; i < numSimulations; i++) {
            let sum = 0;
            for (const k of keys) sum += allSamples[k][i];
            results[i] = sum;
        }
    }

    results.sort((a, b) => a - b);

    const stats = computeStats(results, numSimulations);
    const histogram = computeHistogram(results, 50);

    return { stats, histogram };
}

function computeStats(sorted: number[], n: number): MCStats {
    const sum = sorted.reduce((s, v) => s + v, 0);
    const mean = sum / n;
    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
        numSimulations: n,
        mean: r2(mean),
        stdDev: r2(stdDev),
        coefficientOfVariation: mean !== 0 ? r2((stdDev / Math.abs(mean)) * 100) : 0,
        minimum: r2(sorted[0]),
        maximum: r2(sorted[n - 1]),
        range: r2(sorted[n - 1] - sorted[0]),
        percentile5: r2(sorted[Math.floor(0.05 * n)]),
        percentile10: r2(sorted[Math.floor(0.10 * n)]),
        percentile25: r2(sorted[Math.floor(0.25 * n)]),
        median: r2(sorted[Math.floor(0.50 * n)]),
        percentile75: r2(sorted[Math.floor(0.75 * n)]),
        percentile90: r2(sorted[Math.floor(0.90 * n)]),
        percentile95: r2(sorted[Math.floor(0.95 * n)]),
        probNegative: r2((sorted.filter(v => v < 0).length / n) * 100),
        probPositive: r2((sorted.filter(v => v > 0).length / n) * 100),
    };
}

function computeHistogram(sorted: number[], numBins: number) {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const binWidth = (max - min) / numBins || 1;

    const bins: number[] = [];
    const frequencies: number[] = new Array(numBins).fill(0);

    for (let i = 0; i < numBins; i++) {
        bins.push(r2(min + (i + 0.5) * binWidth));
    }

    for (const v of sorted) {
        let idx = Math.floor((v - min) / binWidth);
        if (idx >= numBins) idx = numBins - 1;
        if (idx < 0) idx = 0;
        frequencies[idx]++;
    }

    return { bins, frequencies, binWidth: r2(binWidth) };
}

function r2(v: number): number {
    return Math.round(v * 100) / 100;
}
