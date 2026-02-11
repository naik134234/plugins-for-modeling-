/**
 * DCF Valuation Engine
 * 
 * Discounted Cash Flow: FCFF projection, Terminal Value (Gordon Growth + Exit Multiple),
 * Enterprise Value, Equity Value per Share.
 */

export interface DCFInput {
    currentFCF: number;
    growthRates: number[];    // growth rate per year (e.g. [0.15, 0.12, 0.10, 0.08, 0.06])
    terminalGrowthRate: number;
    wacc: number;
    netDebt: number;
    sharesOutstanding: number;
    exitMultiple?: number;    // optional EV/EBITDA exit multiple
}

export interface DCFResult {
    projectedFCFs: { year: number; fcf: number; pvFCF: number }[];
    terminalValueGordon: number;
    terminalValueExit: number | null;
    pvTerminalGordon: number;
    pvTerminalExit: number | null;
    enterpriseValueGordon: number;
    enterpriseValueExit: number | null;
    equityValueGordon: number;
    equityValueExit: number | null;
    impliedSharePriceGordon: number;
    impliedSharePriceExit: number | null;
    sumPVFCFs: number;
}

export function calculateDCF(input: DCFInput): DCFResult {
    const { currentFCF, growthRates, terminalGrowthRate, wacc, netDebt, sharesOutstanding, exitMultiple } = input;

    if (wacc <= terminalGrowthRate) throw new Error("WACC must be greater than terminal growth rate.");
    if (sharesOutstanding <= 0) throw new Error("Shares outstanding must be positive.");

    const projectedFCFs: { year: number; fcf: number; pvFCF: number }[] = [];
    let fcf = currentFCF;
    let sumPV = 0;

    for (let i = 0; i < growthRates.length; i++) {
        fcf = fcf * (1 + growthRates[i]);
        const pvFCF = fcf / Math.pow(1 + wacc, i + 1);
        projectedFCFs.push({ year: i + 1, fcf: r2(fcf), pvFCF: r2(pvFCF) });
        sumPV += pvFCF;
    }

    const n = growthRates.length;
    const lastFCF = fcf;

    // Gordon Growth Terminal Value
    const tvGordon = lastFCF * (1 + terminalGrowthRate) / (wacc - terminalGrowthRate);
    const pvTVGordon = tvGordon / Math.pow(1 + wacc, n);

    // Exit Multiple Terminal Value
    let tvExit: number | null = null;
    let pvTVExit: number | null = null;
    if (exitMultiple !== undefined) {
        tvExit = lastFCF * exitMultiple;
        pvTVExit = tvExit / Math.pow(1 + wacc, n);
    }

    const evGordon = sumPV + pvTVGordon;
    const eqGordon = evGordon - netDebt;

    const evExit = pvTVExit !== null ? sumPV + pvTVExit : null;
    const eqExit = evExit !== null ? evExit - netDebt : null;

    return {
        projectedFCFs,
        terminalValueGordon: r2(tvGordon),
        terminalValueExit: tvExit !== null ? r2(tvExit) : null,
        pvTerminalGordon: r2(pvTVGordon),
        pvTerminalExit: pvTVExit !== null ? r2(pvTVExit) : null,
        enterpriseValueGordon: r2(evGordon),
        enterpriseValueExit: evExit !== null ? r2(evExit) : null,
        equityValueGordon: r2(eqGordon),
        equityValueExit: eqExit !== null ? r2(eqExit) : null,
        impliedSharePriceGordon: r2(eqGordon / sharesOutstanding),
        impliedSharePriceExit: eqExit !== null ? r2(eqExit / sharesOutstanding) : null,
        sumPVFCFs: r2(sumPV),
    };
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
