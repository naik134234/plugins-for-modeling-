/**
 * Bond Valuation Engine
 * 
 * Bond Price, YTM, Macaulay Duration, Modified Duration, Convexity.
 */

export interface BondInput {
    faceValue: number;
    couponRate: number;       // annual coupon rate (decimal)
    yearsToMaturity: number;
    marketRate: number;       // yield / discount rate (decimal)
    paymentFrequency: number; // 1=annual, 2=semi-annual, 4=quarterly
}

export interface BondResult {
    bondPrice: number;
    currentYield: number;
    ytm: number;
    macaulayDuration: number;
    modifiedDuration: number;
    convexity: number;
    totalCoupons: number;
    annualCoupon: number;
    cashFlows: { period: number; coupon: number; principal: number; total: number; pv: number }[];
    premiumDiscount: string;
}

export function calculateBond(input: BondInput): BondResult {
    const { faceValue: F, couponRate: c, yearsToMaturity: n, marketRate: y, paymentFrequency: freq } = input;

    const periods = n * freq;
    const periodicCoupon = (c * F) / freq;
    const periodicRate = y / freq;

    // Bond Price
    let price = 0;
    const cashFlows: BondResult["cashFlows"] = [];
    let macaulayNum = 0;
    let convexityNum = 0;

    for (let t = 1; t <= periods; t++) {
        const principal = t === periods ? F : 0;
        const total = periodicCoupon + principal;
        const pv = total / Math.pow(1 + periodicRate, t);

        price += pv;
        macaulayNum += (t / freq) * pv;
        convexityNum += t * (t + 1) * total / Math.pow(1 + periodicRate, t + 2);

        cashFlows.push({
            period: t,
            coupon: r2(periodicCoupon),
            principal: r2(principal),
            total: r2(total),
            pv: r2(pv),
        });
    }

    const macaulayDuration = macaulayNum / price;
    const modifiedDuration = macaulayDuration / (1 + periodicRate);
    const convexity = convexityNum / (price * freq * freq);

    const annualCoupon = c * F;
    const currentYield = annualCoupon / price;

    // YTM via Newton-Raphson
    const ytm = calculateYTM(F, periodicCoupon, periods, price, freq);

    const premiumDiscount = price > F ? "Premium" : price < F ? "Discount" : "Par";

    return {
        bondPrice: r2(price),
        currentYield: r4(currentYield),
        ytm: r4(ytm),
        macaulayDuration: r4(macaulayDuration),
        modifiedDuration: r4(modifiedDuration),
        convexity: r4(convexity),
        totalCoupons: r2(periods * periodicCoupon),
        annualCoupon: r2(annualCoupon),
        cashFlows,
        premiumDiscount,
    };
}

function calculateYTM(faceValue: number, periodicCoupon: number, periods: number, price: number, freq: number): number {
    let rate = 0.05 / freq; // initial guess

    for (let i = 0; i < 200; i++) {
        let pv = 0;
        let dpv = 0;

        for (let t = 1; t <= periods; t++) {
            const cf = periodicCoupon + (t === periods ? faceValue : 0);
            const factor = Math.pow(1 + rate, t);
            pv += cf / factor;
            dpv -= t * cf / Math.pow(1 + rate, t + 1);
        }

        const f = pv - price;
        if (Math.abs(f) < 1e-10) return rate * freq;
        if (Math.abs(dpv) < 1e-20) break;

        rate = rate - f / dpv;
        if (rate < -0.5) rate = 0.001;
        if (rate > 2) rate = 2;
    }

    return rate * freq;
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
