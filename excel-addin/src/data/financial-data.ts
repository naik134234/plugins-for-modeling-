/**
 * Built-in Financial Data for Major Companies
 * 
 * Includes S&P 500 and NIFTY 50 companies with:
 * - Basic info (ticker, name, sector, market cap)
 * - Daily returns (252 trading days, simulated realistic data)
 * - Fundamentals for modeling
 */

// Deterministic seeded pseudo-random for consistent data
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

function generateReturns(seed: number, annualReturn: number, annualVol: number, days = 252): number[] {
    const rand = seededRandom(seed);
    const dailyMu = annualReturn / 252;
    const dailySigma = annualVol / Math.sqrt(252);
    const returns: number[] = [];
    for (let i = 0; i < days; i++) {
        // Box-Muller with seeded random
        const u1 = Math.max(0.0001, rand());
        const u2 = rand();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        returns.push(dailyMu + dailySigma * z);
    }
    return returns;
}

export interface CompanyData {
    ticker: string;
    name: string;
    sector: string;
    exchange: string;
    marketCap: number;         // in billions
    beta: number;
    sharesOutstanding: number; // in millions
    currentPrice: number;

    // Returns data
    dailyReturns: number[];
    annualReturn: number;
    annualVolatility: number;

    // Balance Sheet
    totalAssets: number;       // billions
    totalEquity: number;
    totalLiabilities: number;
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
    cashAndEquivalents: number;
    longTermDebt: number;
    totalReceivables: number;
    totalPayables: number;

    // Income Statement
    revenue: number;           // billions
    costOfGoodsSold: number;
    operatingIncome: number;
    netIncome: number;
    interestExpense: number;
    ebitda: number;
    taxExpense: number;
    dividendsPaid: number;

    // Cash Flow Projections (for DCF)
    freeCashFlow: number;
    fcfGrowthRates: number[];

    // Risk params
    debtFaceValue: number;
    assetVolatility: number;
}

interface CompanySeed {
    ticker: string; name: string; sector: string; exchange: string;
    mcap: number; beta: number; shares: number; price: number;
    annRet: number; annVol: number;
    assets: number; equity: number; liab: number; curA: number; curL: number;
    inv: number; cash: number; ltd: number; rec: number; pay: number;
    rev: number; cogs: number; opInc: number; ni: number; intExp: number;
    ebitda: number; tax: number; div: number; fcf: number;
    fcfGr: number[];
}

const companySeedData: CompanySeed[] = [
    // ═══ S&P 500 (US) ═══
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", exchange: "NASDAQ", mcap: 2890, beta: 1.25, shares: 15400, price: 187.68, annRet: 0.28, annVol: 0.24, assets: 352.6, equity: 62.1, liab: 290.5, curA: 143.6, curL: 145.3, inv: 6.3, cash: 29.9, ltd: 98.1, rec: 60.9, pay: 62.6, rev: 383.3, cogs: 214.1, opInc: 114.3, ni: 97.0, intExp: 3.9, ebitda: 125.8, tax: 16.7, div: 15.0, fcf: 111.4, fcfGr: [0.08, 0.07, 0.06, 0.05, 0.04] },
    { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology", exchange: "NASDAQ", mcap: 2780, beta: 0.90, shares: 7430, price: 374.23, annRet: 0.32, annVol: 0.22, assets: 411.9, equity: 206.2, liab: 205.7, curA: 184.3, curL: 104.1, inv: 2.5, cash: 34.7, ltd: 47.0, rec: 48.7, pay: 18.1, rev: 211.9, cogs: 65.9, opInc: 88.5, ni: 72.4, intExp: 2.0, ebitda: 100.3, tax: 16.9, div: 20.2, fcf: 59.5, fcfGr: [0.12, 0.10, 0.09, 0.07, 0.06] },
    { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Technology", exchange: "NASDAQ", mcap: 1720, beta: 1.06, shares: 12500, price: 137.60, annRet: 0.22, annVol: 0.27, assets: 402.4, equity: 283.4, liab: 119.0, curA: 164.0, curL: 81.8, inv: 0, cash: 30.7, ltd: 14.7, rec: 40.3, pay: 6.0, rev: 307.4, cogs: 133.3, opInc: 84.3, ni: 73.8, intExp: 0.3, ebitda: 97.9, tax: 11.9, div: 0, fcf: 69.5, fcfGr: [0.14, 0.11, 0.09, 0.07, 0.05] },
    { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", exchange: "NASDAQ", mcap: 1560, beta: 1.15, shares: 10300, price: 151.46, annRet: 0.18, annVol: 0.31, assets: 527.9, equity: 201.9, liab: 326.0, curA: 157.7, curL: 164.9, inv: 35.7, cash: 73.4, ltd: 67.1, rec: 35.5, pay: 79.6, rev: 574.8, cogs: 385.9, opInc: 36.9, ni: 30.4, intExp: 3.2, ebitda: 85.5, tax: 7.1, div: 0, fcf: 32.1, fcfGr: [0.20, 0.16, 0.12, 0.09, 0.07] },
    { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", exchange: "NYSE", mcap: 502, beta: 1.08, shares: 2890, price: 173.70, annRet: 0.15, annVol: 0.21, assets: 3740, equity: 303.1, liab: 3437, curA: 800, curL: 500, inv: 0, cash: 567.0, ltd: 295.7, rec: 120, pay: 80, rev: 128.7, cogs: 0, opInc: 55.6, ni: 49.6, intExp: 85.0, ebitda: 70.2, tax: 11.2, div: 11.8, fcf: 35.0, fcfGr: [0.06, 0.05, 0.04, 0.04, 0.03] },
    { ticker: "GS", name: "Goldman Sachs Group", sector: "Financial Services", exchange: "NYSE", mcap: 139, beta: 1.35, shares: 344, price: 404.07, annRet: 0.12, annVol: 0.28, assets: 1570, equity: 116, liab: 1454, curA: 400, curL: 350, inv: 0, cash: 261, ltd: 254, rec: 80, pay: 60, rev: 46.3, cogs: 0, opInc: 14.2, ni: 8.5, intExp: 28.5, ebitda: 18.0, tax: 3.0, div: 3.4, fcf: 12.0, fcfGr: [0.05, 0.04, 0.04, 0.03, 0.03] },
    { ticker: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", exchange: "NYSE", mcap: 383, beta: 0.55, shares: 2410, price: 158.92, annRet: 0.05, annVol: 0.16, assets: 187.4, equity: 68.8, liab: 118.6, curA: 51.8, curL: 55.8, inv: 10.5, cash: 14.7, ltd: 29.9, rec: 15.6, pay: 12.5, rev: 85.2, cogs: 29.9, opInc: 20.8, ni: 35.2, intExp: 0.8, ebitda: 28.5, tax: 2.8, div: 11.3, fcf: 18.2, fcfGr: [0.04, 0.03, 0.03, 0.02, 0.02] },
    { ticker: "PG", name: "Procter & Gamble Co.", sector: "Consumer Defensive", exchange: "NYSE", mcap: 353, beta: 0.42, shares: 2370, price: 149.0, annRet: 0.06, annVol: 0.14, assets: 120.8, equity: 46.8, liab: 74.0, curA: 21.6, curL: 34.0, inv: 6.9, cash: 8.2, ltd: 25.3, rec: 6.3, pay: 14.5, rev: 82.0, cogs: 41.0, opInc: 18.9, ni: 14.7, intExp: 0.8, ebitda: 22.5, tax: 3.6, div: 9.0, fcf: 16.8, fcfGr: [0.04, 0.03, 0.03, 0.02, 0.02] },
    { ticker: "XOM", name: "Exxon Mobil Corp.", sector: "Energy", exchange: "NYSE", mcap: 430, beta: 0.85, shares: 4050, price: 106.17, annRet: 0.10, annVol: 0.23, assets: 376.3, equity: 204.8, liab: 171.5, curA: 97.6, curL: 67.1, inv: 18.9, cash: 29.6, ltd: 40.6, rec: 19.7, pay: 33.0, rev: 344.6, cogs: 245.0, opInc: 54.4, ni: 36.0, intExp: 0.9, ebitda: 72.0, tax: 14.5, div: 14.9, fcf: 33.4, fcfGr: [0.03, 0.02, 0.02, 0.01, 0.01] },
    { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Technology", exchange: "NASDAQ", mcap: 1200, beta: 1.65, shares: 24700, price: 48.58, annRet: 0.75, annVol: 0.52, assets: 65.7, equity: 42.0, liab: 23.7, curA: 33.7, curL: 10.6, inv: 5.3, cash: 7.3, ltd: 9.7, rec: 9.0, pay: 2.8, rev: 60.9, cogs: 16.6, opInc: 32.9, ni: 29.8, intExp: 0.3, ebitda: 35.5, tax: 4.0, div: 0.4, fcf: 27.0, fcfGr: [0.25, 0.18, 0.14, 0.10, 0.08] },
    { ticker: "V", name: "Visa Inc.", sector: "Financial Services", exchange: "NYSE", mcap: 510, beta: 0.94, shares: 2050, price: 248.78, annRet: 0.20, annVol: 0.19, assets: 90.5, equity: 37.6, liab: 52.9, curA: 23.5, curL: 24.0, inv: 0, cash: 16.3, ltd: 20.5, rec: 5.8, pay: 2.0, rev: 32.7, cogs: 12.7, opInc: 20.5, ni: 17.3, intExp: 0.6, ebitda: 22.1, tax: 3.8, div: 3.6, fcf: 18.5, fcfGr: [0.10, 0.09, 0.08, 0.06, 0.05] },
    { ticker: "UNH", name: "UnitedHealth Group", sector: "Healthcare", exchange: "NYSE", mcap: 480, beta: 0.65, shares: 930, price: 516.13, annRet: 0.14, annVol: 0.20, assets: 273.7, equity: 78.5, liab: 195.2, curA: 91.5, curL: 98.2, inv: 0, cash: 23.4, ltd: 54.1, rec: 30.1, pay: 40.2, rev: 371.6, cogs: 305.1, opInc: 30.4, ni: 22.4, intExp: 3.0, ebitda: 39.0, tax: 5.7, div: 6.6, fcf: 24.1, fcfGr: [0.09, 0.08, 0.07, 0.05, 0.04] },
    { ticker: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive", exchange: "NYSE", mcap: 415, beta: 0.50, shares: 2700, price: 153.70, annRet: 0.08, annVol: 0.17, assets: 243.2, equity: 83.9, liab: 159.3, curA: 75.6, curL: 92.4, inv: 56.6, cash: 8.9, ltd: 36.1, rec: 7.6, pay: 53.7, rev: 611.3, cogs: 463.7, opInc: 27.0, ni: 11.7, intExp: 2.1, ebitda: 39.0, tax: 5.6, div: 6.1, fcf: 17.0, fcfGr: [0.05, 0.04, 0.03, 0.03, 0.02] },
    { ticker: "MA", name: "Mastercard Inc.", sector: "Financial Services", exchange: "NYSE", mcap: 380, beta: 1.04, shares: 937, price: 405.55, annRet: 0.18, annVol: 0.21, assets: 42.3, equity: 5.3, liab: 37.0, curA: 16.7, curL: 14.5, inv: 0, cash: 8.3, ltd: 14.3, rec: 3.5, pay: 1.2, rev: 25.1, cogs: 10.5, opInc: 14.5, ni: 11.2, intExp: 0.5, ebitda: 15.8, tax: 2.6, div: 2.1, fcf: 12.0, fcfGr: [0.11, 0.09, 0.08, 0.06, 0.05] },
    { ticker: "BAC", name: "Bank of America Corp.", sector: "Financial Services", exchange: "NYSE", mcap: 264, beta: 1.35, shares: 7980, price: 33.08, annRet: 0.10, annVol: 0.26, assets: 3180, equity: 276.5, liab: 2904, curA: 700, curL: 450, inv: 0, cash: 356, ltd: 276.8, rec: 90, pay: 60, rev: 98.6, cogs: 0, opInc: 35.0, ni: 26.5, intExp: 55.0, ebitda: 45.0, tax: 6.5, div: 7.6, fcf: 20.0, fcfGr: [0.05, 0.04, 0.03, 0.03, 0.02] },
    // ═══ NIFTY 50 (India) ═══
    { ticker: "RELIANCE", name: "Reliance Industries", sector: "Energy", exchange: "NSE", mcap: 240, beta: 0.82, shares: 6770, price: 2550, annRet: 0.16, annVol: 0.25, assets: 160, equity: 67, liab: 93, curA: 52, curL: 48, inv: 18, cash: 12, ltd: 35, rec: 12, pay: 25, rev: 95, cogs: 62, opInc: 18, ni: 12, intExp: 4, ebitda: 25, tax: 3.5, div: 1.2, fcf: 10, fcfGr: [0.10, 0.08, 0.07, 0.05, 0.04] },
    { ticker: "TCS", name: "Tata Consultancy Services", sector: "Technology", exchange: "NSE", mcap: 185, beta: 0.60, shares: 3660, price: 3700, annRet: 0.12, annVol: 0.18, assets: 42, equity: 28, liab: 14, curA: 28, curL: 12, inv: 0, cash: 8, ltd: 0.5, rec: 10, pay: 4, rev: 58, cogs: 36, opInc: 16, ni: 12, intExp: 0.1, ebitda: 18, tax: 3.2, div: 8.5, fcf: 11.5, fcfGr: [0.09, 0.08, 0.06, 0.05, 0.04] },
    { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", sector: "Financial Services", exchange: "NSE", mcap: 155, beta: 0.95, shares: 7600, price: 1650, annRet: 0.14, annVol: 0.20, assets: 480, equity: 53, liab: 427, curA: 120, curL: 80, inv: 0, cash: 85, ltd: 45, rec: 30, pay: 20, rev: 28, cogs: 0, opInc: 14, ni: 10, intExp: 18, ebitda: 16, tax: 3.5, div: 2.0, fcf: 8, fcfGr: [0.12, 0.10, 0.08, 0.06, 0.05] },
    { ticker: "INFY", name: "Infosys Ltd.", sector: "Technology", exchange: "NSE", mcap: 95, beta: 0.72, shares: 4140, price: 1580, annRet: 0.10, annVol: 0.22, assets: 22, equity: 15, liab: 7, curA: 16, curL: 6, inv: 0, cash: 4, ltd: 0.3, rec: 5, pay: 2, rev: 18, cogs: 11, opInc: 5, ni: 3.6, intExp: 0.05, ebitda: 5.8, tax: 1.0, div: 3.0, fcf: 3.2, fcfGr: [0.10, 0.08, 0.07, 0.05, 0.04] },
    { ticker: "ICICIBANK", name: "ICICI Bank Ltd.", sector: "Financial Services", exchange: "NSE", mcap: 102, beta: 1.10, shares: 7010, price: 1040, annRet: 0.18, annVol: 0.24, assets: 360, equity: 42, liab: 318, curA: 90, curL: 60, inv: 0, cash: 65, ltd: 38, rec: 25, pay: 15, rev: 22, cogs: 0, opInc: 11, ni: 8, intExp: 14, ebitda: 13, tax: 2.5, div: 1.5, fcf: 6.5, fcfGr: [0.14, 0.11, 0.09, 0.07, 0.05] },
    { ticker: "HINDUNILVR", name: "Hindustan Unilever", sector: "Consumer Defensive", exchange: "NSE", mcap: 78, beta: 0.35, shares: 2350, price: 2500, annRet: 0.04, annVol: 0.15, assets: 15, equity: 8, liab: 7, curA: 8, curL: 6, inv: 2.5, cash: 1.5, ltd: 0.5, rec: 2, pay: 3, rev: 14, cogs: 8, opInc: 3.5, ni: 2.8, intExp: 0.05, ebitda: 4, tax: 0.7, div: 2.5, fcf: 2.5, fcfGr: [0.06, 0.05, 0.04, 0.03, 0.02] },
    { ticker: "SBIN", name: "State Bank of India", sector: "Financial Services", exchange: "NSE", mcap: 68, beta: 1.25, shares: 8930, price: 620, annRet: 0.20, annVol: 0.30, assets: 750, equity: 45, liab: 705, curA: 180, curL: 120, inv: 0, cash: 140, ltd: 65, rec: 50, pay: 30, rev: 42, cogs: 0, opInc: 18, ni: 12, intExp: 30, ebitda: 22, tax: 4, div: 2.2, fcf: 10, fcfGr: [0.10, 0.08, 0.06, 0.05, 0.04] },
    { ticker: "BHARTIARTL", name: "Bharti Airtel Ltd.", sector: "Communication", exchange: "NSE", mcap: 85, beta: 0.70, shares: 5930, price: 1120, annRet: 0.22, annVol: 0.26, assets: 55, equity: 12, liab: 43, curA: 10, curL: 18, inv: 0.5, cash: 3, ltd: 25, rec: 3, pay: 6, rev: 15, cogs: 6, opInc: 5, ni: 2, intExp: 3, ebitda: 7, tax: 0.5, div: 0.3, fcf: 3.5, fcfGr: [0.15, 0.12, 0.09, 0.07, 0.05] },
    { ticker: "ITC", name: "ITC Ltd.", sector: "Consumer Defensive", exchange: "NSE", mcap: 65, beta: 0.50, shares: 12500, price: 440, annRet: 0.08, annVol: 0.18, assets: 20, equity: 14, liab: 6, curA: 12, curL: 5, inv: 4, cash: 2, ltd: 0.3, rec: 3, pay: 2, rev: 17, cogs: 9, opInc: 6, ni: 5, intExp: 0.05, ebitda: 7, tax: 1.5, div: 4.0, fcf: 4.5, fcfGr: [0.06, 0.05, 0.04, 0.03, 0.03] },
    { ticker: "LT", name: "Larsen & Toubro", sector: "Industrials", exchange: "NSE", mcap: 60, beta: 1.15, shares: 1400, price: 3200, annRet: 0.15, annVol: 0.28, assets: 45, equity: 15, liab: 30, curA: 22, curL: 18, inv: 3, cash: 5, ltd: 10, rec: 12, pay: 8, rev: 22, cogs: 16, opInc: 4, ni: 2.8, intExp: 1.5, ebitda: 5.5, tax: 0.8, div: 1.0, fcf: 2.0, fcfGr: [0.12, 0.10, 0.08, 0.06, 0.05] },
];

function buildCompanyData(seed: CompanySeed, idx: number): CompanyData {
    return {
        ticker: seed.ticker,
        name: seed.name,
        sector: seed.sector,
        exchange: seed.exchange,
        marketCap: seed.mcap,
        beta: seed.beta,
        sharesOutstanding: seed.shares,
        currentPrice: seed.price,
        dailyReturns: generateReturns(idx * 1000 + 42, seed.annRet, seed.annVol),
        annualReturn: seed.annRet,
        annualVolatility: seed.annVol,
        totalAssets: seed.assets,
        totalEquity: seed.equity,
        totalLiabilities: seed.liab,
        currentAssets: seed.curA,
        currentLiabilities: seed.curL,
        inventory: seed.inv,
        cashAndEquivalents: seed.cash,
        longTermDebt: seed.ltd,
        totalReceivables: seed.rec,
        totalPayables: seed.pay,
        revenue: seed.rev,
        costOfGoodsSold: seed.cogs,
        operatingIncome: seed.opInc,
        netIncome: seed.ni,
        interestExpense: seed.intExp,
        ebitda: seed.ebitda,
        taxExpense: seed.tax,
        dividendsPaid: seed.div,
        freeCashFlow: seed.fcf,
        fcfGrowthRates: seed.fcfGr,
        debtFaceValue: seed.ltd + seed.curL * 0.3,
        assetVolatility: seed.annVol * 0.6,
    };
}

export const COMPANIES: CompanyData[] = companySeedData.map((s, i) => buildCompanyData(s, i));

export function getCompanyByTicker(ticker: string): CompanyData | undefined {
    return COMPANIES.find(c => c.ticker === ticker);
}

export function getCompaniesByExchange(exchange: string): CompanyData[] {
    return COMPANIES.filter(c => c.exchange === exchange);
}

export function getCompaniesBySector(sector: string): CompanyData[] {
    return COMPANIES.filter(c => c.sector === sector);
}

export function getAllSectors(): string[] {
    return [...new Set(COMPANIES.map(c => c.sector))];
}

export function getAllExchanges(): string[] {
    return [...new Set(COMPANIES.map(c => c.exchange))];
}
