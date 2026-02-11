/**
 * Capital Budgeting Engine
 * 
 * NPV, IRR (Newton-Raphson), Payback Period, Profitability Index
 */

export interface CapBudgetInput {
    cashFlows: number[];
    discountRate: number;
}

export interface CapBudgetResult {
    npv: number;
    irr: number | null;
    paybackPeriod: number | null;
    discountedPaybackPeriod: number | null;
    profitabilityIndex: number;
    cashFlowSummary: { period: number; cashFlow: number; pvCashFlow: number; cumulative: number }[];
}

export function calculateCapitalBudgeting(input: CapBudgetInput): CapBudgetResult {
    const { cashFlows, discountRate } = input;

    if (cashFlows.length < 2) throw new Error("Need at least 2 cash flows (initial investment + future).");

    const npv = calculateNPV(discountRate, cashFlows);
    const irr = calculateIRR(cashFlows);
    const paybackPeriod = calculatePayback(cashFlows);
    const discountedPaybackPeriod = calculateDiscountedPayback(cashFlows, discountRate);
    const pi = calculatePI(discountRate, cashFlows);

    // Cash flow summary
    const summary = cashFlows.map((cf, t) => {
        const pvCf = cf / Math.pow(1 + discountRate, t);
        return { period: t, cashFlow: r2(cf), pvCashFlow: r2(pvCf), cumulative: 0 };
    });
    let cumulative = 0;
    for (const s of summary) {
        cumulative += s.pvCashFlow;
        s.cumulative = r2(cumulative);
    }

    return {
        npv: r2(npv),
        irr: irr !== null ? r4(irr) : null,
        paybackPeriod: paybackPeriod !== null ? r2(paybackPeriod) : null,
        discountedPaybackPeriod: discountedPaybackPeriod !== null ? r2(discountedPaybackPeriod) : null,
        profitabilityIndex: r4(pi),
        cashFlowSummary: summary,
    };
}

function calculateNPV(rate: number, cashFlows: number[]): number {
    return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
}

function calculateIRR(cashFlows: number[], maxIterations = 200, tolerance = 1e-10): number | null {
    // Newton-Raphson method
    let rate = 0.1; // initial guess

    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0; // derivative

        for (let t = 0; t < cashFlows.length; t++) {
            const factor = Math.pow(1 + rate, t);
            npv += cashFlows[t] / factor;
            if (t > 0) {
                dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
            }
        }

        if (Math.abs(npv) < tolerance) return rate;
        if (Math.abs(dnpv) < 1e-20) break;

        const newRate = rate - npv / dnpv;

        // Clamp to reasonable range
        if (newRate < -0.99) rate = -0.99;
        else if (newRate > 100) rate = 100;
        else rate = newRate;
    }

    // Bisection fallback
    let lo = -0.99, hi = 10;
    for (let i = 0; i < 1000; i++) {
        const mid = (lo + hi) / 2;
        const npvMid = calculateNPV(mid, cashFlows);
        if (Math.abs(npvMid) < tolerance) return mid;
        if (npvMid > 0) lo = mid;
        else hi = mid;
    }

    return null;
}

function calculatePayback(cashFlows: number[]): number | null {
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
        cumulative += cashFlows[t];
        if (cumulative >= 0 && t > 0) {
            const prev = cumulative - cashFlows[t];
            const fraction = Math.abs(prev) / cashFlows[t];
            return t - 1 + fraction;
        }
    }
    return null;
}

function calculateDiscountedPayback(cashFlows: number[], rate: number): number | null {
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
        const pvCf = cashFlows[t] / Math.pow(1 + rate, t);
        cumulative += pvCf;
        if (cumulative >= 0 && t > 0) {
            const prev = cumulative - pvCf;
            const fraction = Math.abs(prev) / pvCf;
            return t - 1 + fraction;
        }
    }
    return null;
}

function calculatePI(rate: number, cashFlows: number[]): number {
    const initialInvestment = Math.abs(cashFlows[0]);
    if (initialInvestment === 0) return 0;

    const pvFuture = cashFlows.slice(1).reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i + 1), 0);
    return pvFuture / initialInvestment;
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
