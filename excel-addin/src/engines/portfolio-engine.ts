/**
 * Portfolio Optimization Engine — Markowitz Mean-Variance
 * 
 * Efficient frontier, max Sharpe, min variance portfolios.
 */

export interface PortfolioAsset {
    name: string;
    expectedReturn: number;  // annualized
    volatility: number;      // annualized std dev
}

export interface PortfolioInput {
    assets: PortfolioAsset[];
    correlationMatrix: number[][]; // NxN
    riskFreeRate: number;
    numFrontierPoints?: number;
}

export interface PortfolioResult {
    minVariancePortfolio: PortfolioAllocation;
    maxSharpePortfolio: PortfolioAllocation;
    equalWeightPortfolio: PortfolioAllocation;
    efficientFrontier: { ret: number; risk: number }[];
    covarianceMatrix: number[][];
}

export interface PortfolioAllocation {
    weights: { asset: string; weight: number }[];
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
}

export function optimizePortfolio(input: PortfolioInput): PortfolioResult {
    const { assets, correlationMatrix, riskFreeRate, numFrontierPoints = 20 } = input;
    const n = assets.length;

    if (n < 2) throw new Error("Need at least 2 assets for portfolio optimization.");
    if (correlationMatrix.length !== n) throw new Error("Correlation matrix dimensions must match number of assets.");

    // Build covariance matrix from volatilities and correlations
    const covMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
        covMatrix[i] = [];
        for (let j = 0; j < n; j++) {
            covMatrix[i][j] = assets[i].volatility * assets[j].volatility * correlationMatrix[i][j];
        }
    }

    const returns = assets.map(a => a.expectedReturn);

    // Equal weight portfolio
    const eqWeights = new Array(n).fill(1 / n);
    const equalWeightPortfolio = buildAllocation(assets, eqWeights, covMatrix, riskFreeRate);

    // Find min variance and max sharpe via grid search of weight combinations
    // For >2 assets, we use random sampling + optimization
    let bestMinVar: { weights: number[]; var: number } = { weights: eqWeights, var: Infinity };
    let bestMaxSharpe: { weights: number[]; sharpe: number } = { weights: eqWeights, sharpe: -Infinity };

    const iterations = n <= 3 ? 10000 : 30000;

    for (let iter = 0; iter < iterations; iter++) {
        const w = randomWeights(n);
        const ret = portfolioReturn(w, returns);
        const vol = portfolioVol(w, covMatrix);
        const sharpe = (ret - riskFreeRate) / vol;

        if (vol < bestMinVar.var) {
            bestMinVar = { weights: [...w], var: vol };
        }
        if (sharpe > bestMaxSharpe.sharpe) {
            bestMaxSharpe = { weights: [...w], sharpe };
        }
    }

    const minVariancePortfolio = buildAllocation(assets, bestMinVar.weights, covMatrix, riskFreeRate);
    const maxSharpePortfolio = buildAllocation(assets, bestMaxSharpe.weights, covMatrix, riskFreeRate);

    // Efficient frontier
    const minRet = Math.min(...returns) * 0.5;
    const maxRet = Math.max(...returns) * 1.2;
    const frontier: { ret: number; risk: number }[] = [];

    for (let i = 0; i < numFrontierPoints; i++) {
        const targetRet = minRet + (maxRet - minRet) * i / (numFrontierPoints - 1);
        // Find min variance portfolio for this target return
        let bestVol = Infinity;
        for (let j = 0; j < 3000; j++) {
            const w = randomWeights(n);
            const ret = portfolioReturn(w, returns);
            if (Math.abs(ret - targetRet) > 0.02) continue;
            const vol = portfolioVol(w, covMatrix);
            if (vol < bestVol) bestVol = vol;
        }
        if (bestVol < Infinity) {
            frontier.push({ ret: r4(targetRet), risk: r4(bestVol) });
        }
    }

    return {
        minVariancePortfolio,
        maxSharpePortfolio,
        equalWeightPortfolio,
        efficientFrontier: frontier,
        covarianceMatrix: covMatrix.map(row => row.map(v => r6(v))),
    };
}

function randomWeights(n: number): number[] {
    const raw = new Array(n).fill(0).map(() => -Math.log(Math.random()));
    const sum = raw.reduce((s, v) => s + v, 0);
    return raw.map(v => v / sum);
}

function portfolioReturn(w: number[], returns: number[]): number {
    return w.reduce((s, wi, i) => s + wi * returns[i], 0);
}

function portfolioVol(w: number[], cov: number[][]): number {
    let variance = 0;
    for (let i = 0; i < w.length; i++) {
        for (let j = 0; j < w.length; j++) {
            variance += w[i] * w[j] * cov[i][j];
        }
    }
    return Math.sqrt(Math.max(0, variance));
}

function buildAllocation(assets: PortfolioAsset[], w: number[], cov: number[][], rf: number): PortfolioAllocation {
    const ret = portfolioReturn(w, assets.map(a => a.expectedReturn));
    const vol = portfolioVol(w, cov);
    return {
        weights: assets.map((a, i) => ({ asset: a.name, weight: r4(w[i]) })),
        expectedReturn: r4(ret),
        volatility: r4(vol),
        sharpeRatio: vol > 0 ? r4((ret - rf) / vol) : 0,
    };
}

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function r6(v: number): number { return Math.round(v * 1000000) / 1000000; }
