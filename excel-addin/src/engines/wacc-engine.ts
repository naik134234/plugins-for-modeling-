/**
 * WACC Engine
 * 
 * Weighted Average Cost of Capital using CAPM for cost of equity.
 */

export interface WACCInput {
    riskFreeRate: number;
    marketReturn: number;
    beta: number;
    equityMarketValue: number;
    debtMarketValue: number;
    costOfDebt: number;
    taxRate: number;
    preferredEquity?: number;
    costOfPreferred?: number;
}

export interface WACCResult {
    costOfEquity: number;      // CAPM: Rf + β(Rm - Rf)
    equityRiskPremium: number;
    afterTaxCostOfDebt: number;
    weightEquity: number;
    weightDebt: number;
    weightPreferred: number;
    wacc: number;
    totalCapital: number;
}

export function calculateWACC(input: WACCInput): WACCResult {
    const {
        riskFreeRate: rf, marketReturn: rm, beta,
        equityMarketValue: E, debtMarketValue: D, costOfDebt: rd, taxRate: t,
        preferredEquity: P = 0, costOfPreferred: rp = 0
    } = input;

    const totalCapital = E + D + P;
    if (totalCapital <= 0) throw new Error("Total capital must be positive.");

    const costOfEquity = rf + beta * (rm - rf);
    const equityRiskPremium = rm - rf;
    const afterTaxCostOfDebt = rd * (1 - t);

    const wE = E / totalCapital;
    const wD = D / totalCapital;
    const wP = P / totalCapital;

    const wacc = wE * costOfEquity + wD * afterTaxCostOfDebt + wP * rp;

    return {
        costOfEquity: r4(costOfEquity),
        equityRiskPremium: r4(equityRiskPremium),
        afterTaxCostOfDebt: r4(afterTaxCostOfDebt),
        weightEquity: r4(wE),
        weightDebt: r4(wD),
        weightPreferred: r4(wP),
        wacc: r4(wacc),
        totalCapital: r2(totalCapital),
    };
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
