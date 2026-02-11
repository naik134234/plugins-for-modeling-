/**
 * Financial Ratios Engine
 * 
 * Liquidity, Profitability, Leverage, Efficiency, DuPont Analysis.
 */

export interface RatiosInput {
    // Balance Sheet
    currentAssets: number;
    inventory: number;
    cashAndEquivalents: number;
    totalAssets: number;
    currentLiabilities: number;
    totalLiabilities: number;
    totalEquity: number;
    longTermDebt: number;

    // Income Statement
    revenue: number;
    costOfGoodsSold: number;
    operatingIncome: number;
    netIncome: number;
    interestExpense: number;
    ebitda: number;
    taxExpense: number;

    // Other
    totalReceivables: number;
    totalPayables: number;
    dividendsPaid: number;
    sharesOutstanding: number;
    marketPrice: number;
}

export interface RatiosResult {
    liquidity: {
        currentRatio: number;
        quickRatio: number;
        cashRatio: number;
        workingCapital: number;
    };
    profitability: {
        grossMargin: number;
        operatingMargin: number;
        netMargin: number;
        roe: number;
        roa: number;
        roic: number;
    };
    leverage: {
        debtToEquity: number;
        debtToAssets: number;
        equityMultiplier: number;
        interestCoverage: number;
        debtToEBITDA: number;
    };
    efficiency: {
        assetTurnover: number;
        receivablesTurnover: number;
        daysReceivables: number;
        payablesTurnover: number;
        daysPayables: number;
        inventoryTurnover: number;
        daysInventory: number;
        cashConversionCycle: number;
    };
    valuation: {
        eps: number;
        pe: number;
        priceToBook: number;
        dividendYield: number;
        dividendPayout: number;
    };
    dupont: {
        netMargin: number;
        assetTurnover: number;
        equityMultiplier: number;
        roe: number;
        taxBurden: number;
        interestBurden: number;
    };
}

export function calculateRatios(input: RatiosInput): RatiosResult {
    const i = input;
    const grossProfit = i.revenue - i.costOfGoodsSold;
    const ebt = i.netIncome + i.taxExpense;

    const liquidity = {
        currentRatio: r2(i.currentAssets / i.currentLiabilities),
        quickRatio: r2((i.currentAssets - i.inventory) / i.currentLiabilities),
        cashRatio: r2(i.cashAndEquivalents / i.currentLiabilities),
        workingCapital: r2(i.currentAssets - i.currentLiabilities),
    };

    const profitability = {
        grossMargin: r4(grossProfit / i.revenue),
        operatingMargin: r4(i.operatingIncome / i.revenue),
        netMargin: r4(i.netIncome / i.revenue),
        roe: r4(i.netIncome / i.totalEquity),
        roa: r4(i.netIncome / i.totalAssets),
        roic: r4(i.operatingIncome * (1 - i.taxExpense / ebt) / (i.totalEquity + i.longTermDebt)),
    };

    const leverage = {
        debtToEquity: r2(i.totalLiabilities / i.totalEquity),
        debtToAssets: r4(i.totalLiabilities / i.totalAssets),
        equityMultiplier: r2(i.totalAssets / i.totalEquity),
        interestCoverage: i.interestExpense > 0 ? r2(i.ebitda / i.interestExpense) : Infinity,
        debtToEBITDA: i.ebitda > 0 ? r2(i.longTermDebt / i.ebitda) : Infinity,
    };

    const assetTurnover = i.revenue / i.totalAssets;
    const recTurn = i.totalReceivables > 0 ? i.revenue / i.totalReceivables : 0;
    const payTurn = i.totalPayables > 0 ? i.costOfGoodsSold / i.totalPayables : 0;
    const invTurn = i.inventory > 0 ? i.costOfGoodsSold / i.inventory : 0;
    const daysRec = recTurn > 0 ? 365 / recTurn : 0;
    const daysPay = payTurn > 0 ? 365 / payTurn : 0;
    const daysInv = invTurn > 0 ? 365 / invTurn : 0;

    const efficiency = {
        assetTurnover: r4(assetTurnover),
        receivablesTurnover: r2(recTurn),
        daysReceivables: r1(daysRec),
        payablesTurnover: r2(payTurn),
        daysPayables: r1(daysPay),
        inventoryTurnover: r2(invTurn),
        daysInventory: r1(daysInv),
        cashConversionCycle: r1(daysRec + daysInv - daysPay),
    };

    const eps = i.netIncome / i.sharesOutstanding;
    const bookValue = i.totalEquity / i.sharesOutstanding;

    const valuation = {
        eps: r2(eps),
        pe: eps > 0 ? r2(i.marketPrice / eps) : 0,
        priceToBook: bookValue > 0 ? r2(i.marketPrice / bookValue) : 0,
        dividendYield: r4(i.dividendsPaid / (i.marketPrice * i.sharesOutstanding)),
        dividendPayout: i.netIncome > 0 ? r4(i.dividendsPaid / i.netIncome) : 0,
    };

    const equityMultiplier = i.totalAssets / i.totalEquity;
    const netMargin = i.netIncome / i.revenue;
    const taxBurden = ebt > 0 ? i.netIncome / ebt : 0;
    const interestBurden = i.operatingIncome > 0 ? ebt / i.operatingIncome : 0;

    const dupont = {
        netMargin: r4(netMargin),
        assetTurnover: r4(assetTurnover),
        equityMultiplier: r4(equityMultiplier),
        roe: r4(netMargin * assetTurnover * equityMultiplier),
        taxBurden: r4(taxBurden),
        interestBurden: r4(interestBurden),
    };

    return { liquidity, profitability, leverage, efficiency, valuation, dupont };
}

function r1(v: number): number { return Math.round(v * 10) / 10; }
function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
