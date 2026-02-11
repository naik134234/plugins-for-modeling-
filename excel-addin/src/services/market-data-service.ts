/**
 * Market Data Service — Yahoo Finance + Alpha Vantage
 * 
 * Fetches real-time prices, fundamentals, and historical data.
 * Uses in-memory cache with TTL to minimize API calls.
 * Falls back to hardcoded data when APIs are unavailable.
 */

import { CompanyData } from "../data/financial-data";

// ─── Config ───────────────────────────────────────────────
const ALPHA_VANTAGE_KEY = "LBE8AQPKX0SYIXWN";
const YAHOO_BASE = "/api/yahoo";      // Proxied via Vite
const AV_BASE = "/api/alphavantage";   // Proxied via Vite

// ─── Cache ────────────────────────────────────────────────
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
    cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

const TTL_QUOTE = 15 * 60 * 1000;       // 15 minutes
const TTL_FUNDAMENTALS = 24 * 60 * 60 * 1000; // 24 hours
const TTL_HISTORY = 6 * 60 * 60 * 1000;  // 6 hours

// ─── Rate Limiter ─────────────────────────────────────────
const rateLimitQueue: { resolve: () => void; delay: number }[] = [];
let isProcessingQueue = false;

async function rateLimitedFetch(url: string, minDelayMs = 500): Promise<Response> {
    return new Promise((resolve, reject) => {
        const doFetch = async () => {
            try {
                const response = await fetch(url, {
                    headers: { "Accept": "application/json" },
                    signal: AbortSignal.timeout(10000),
                });
                resolve(response);
            } catch (e) {
                reject(e);
            }
        };

        if (!isProcessingQueue) {
            isProcessingQueue = true;
            doFetch();
            setTimeout(() => {
                isProcessingQueue = false;
                const next = rateLimitQueue.shift();
                if (next) next.resolve();
            }, minDelayMs);
        } else {
            rateLimitQueue.push({
                delay: minDelayMs,
                resolve: () => {
                    doFetch();
                    setTimeout(() => {
                        isProcessingQueue = false;
                        const next = rateLimitQueue.shift();
                        if (next) next.resolve();
                    }, minDelayMs);
                },
            });
        }
    });
}

// ─── Yahoo Finance ────────────────────────────────────────

export interface YahooQuote {
    symbol: string;
    shortName: string;
    longName?: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketVolume: number;
    marketCap: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    trailingPE?: number;
    forwardPE?: number;
    dividendYield?: number;
    beta?: number;
    sharesOutstanding?: number;
    sector?: string;
    exchange?: string;
}

export async function fetchYahooQuote(ticker: string): Promise<YahooQuote | null> {
    const cacheKey = `yq_${ticker}`;
    const cached = getCached<YahooQuote>(cacheKey);
    if (cached) return cached;

    try {
        // Yahoo Finance v8 quote endpoint
        const resp = await rateLimitedFetch(
            `${YAHOO_BASE}/v8/finance/chart/${ticker}?range=1d&interval=1d&includePrePost=false`,
            600
        );
        if (!resp.ok) return null;
        const data = await resp.json();

        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const quote: YahooQuote = {
            symbol: meta.symbol || ticker,
            shortName: meta.shortName || ticker,
            longName: meta.longName,
            regularMarketPrice: meta.regularMarketPrice ?? 0,
            regularMarketChange: 0,
            regularMarketChangePercent: 0,
            regularMarketVolume: meta.regularMarketVolume ?? 0,
            marketCap: 0,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
            beta: undefined,
            sharesOutstanding: undefined,
            sector: undefined,
            exchange: meta.exchangeName || undefined,
        };

        setCache(cacheKey, quote, TTL_QUOTE);
        return quote;
    } catch (e) {
        console.warn(`Yahoo quote failed for ${ticker}:`, e);
        return null;
    }
}

export interface YahooHistoricalData {
    dates: string[];
    closes: number[];
    dailyReturns: number[];
    annualReturn: number;
    annualVolatility: number;
}

export async function fetchYahooHistory(ticker: string, days = 365): Promise<YahooHistoricalData | null> {
    const cacheKey = `yh_${ticker}_${days}`;
    const cached = getCached<YahooHistoricalData>(cacheKey);
    if (cached) return cached;

    try {
        const range = days <= 100 ? "3mo" : days <= 252 ? "1y" : "2y";
        const resp = await rateLimitedFetch(
            `${YAHOO_BASE}/v8/finance/chart/${ticker}?range=${range}&interval=1d&includePrePost=false`,
            600
        );
        if (!resp.ok) return null;
        const data = await resp.json();

        const result = data?.chart?.result?.[0];
        if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) return null;

        const timestamps: number[] = result.timestamp;
        const closes: (number | null)[] = result.indicators.quote[0].close;

        // Filter out nulls and build arrays
        const validDates: string[] = [];
        const validCloses: number[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] != null) {
                validDates.push(new Date(timestamps[i] * 1000).toISOString().split("T")[0]);
                validCloses.push(closes[i]!);
            }
        }

        // Calculate daily returns
        const dailyReturns: number[] = [];
        for (let i = 1; i < validCloses.length; i++) {
            dailyReturns.push((validCloses[i] - validCloses[i - 1]) / validCloses[i - 1]);
        }

        // Annualize
        const n = dailyReturns.length;
        const meanReturn = dailyReturns.reduce((s, r) => s + r, 0) / n;
        const variance = dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / n;
        const dailyVol = Math.sqrt(variance);

        const history: YahooHistoricalData = {
            dates: validDates,
            closes: validCloses,
            dailyReturns,
            annualReturn: Math.round(meanReturn * 252 * 10000) / 10000,
            annualVolatility: Math.round(dailyVol * Math.sqrt(252) * 10000) / 10000,
        };

        setCache(cacheKey, history, TTL_HISTORY);
        return history;
    } catch (e) {
        console.warn(`Yahoo history failed for ${ticker}:`, e);
        return null;
    }
}

// ─── Alpha Vantage ────────────────────────────────────────

export interface AVOverview {
    Symbol: string;
    Name: string;
    Sector: string;
    Industry: string;
    MarketCapitalization: number;
    Beta: number;
    SharesOutstanding: number;
    EPS: number;
    PERatio: number;
    DividendYield: number;
    BookValue: number;
    RevenueTTM: number;
    GrossProfitTTM: number;
    OperatingMarginTTM: number;
    EBITDA: number;
    ReturnOnEquityTTM: number;
    ReturnOnAssetsTTM: number;
}

export async function fetchAVOverview(ticker: string): Promise<AVOverview | null> {
    const cacheKey = `avo_${ticker}`;
    const cached = getCached<AVOverview>(cacheKey);
    if (cached) return cached;

    try {
        const resp = await rateLimitedFetch(
            `${AV_BASE}/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`,
            1200  // 1 req/sec for Alpha Vantage
        );
        if (!resp.ok) return null;
        const data = await resp.json();

        // Check for rate limit or error
        if (data.Information || data.Note || !data.Symbol) return null;

        const overview: AVOverview = {
            Symbol: data.Symbol,
            Name: data.Name,
            Sector: data.Sector,
            Industry: data.Industry,
            MarketCapitalization: parseFloat(data.MarketCapitalization) / 1e9 || 0,
            Beta: parseFloat(data.Beta) || 1.0,
            SharesOutstanding: parseFloat(data.SharesOutstanding) / 1e6 || 0,
            EPS: parseFloat(data.EPS) || 0,
            PERatio: parseFloat(data.PERatio) || 0,
            DividendYield: parseFloat(data.DividendYield) || 0,
            BookValue: parseFloat(data.BookValue) || 0,
            RevenueTTM: parseFloat(data.RevenueTTM) / 1e9 || 0,
            GrossProfitTTM: parseFloat(data.GrossProfitTTM) / 1e9 || 0,
            OperatingMarginTTM: parseFloat(data.OperatingMarginTTM) || 0,
            EBITDA: parseFloat(data.EBITDA) / 1e9 || 0,
            ReturnOnEquityTTM: parseFloat(data.ReturnOnEquityTTM) || 0,
            ReturnOnAssetsTTM: parseFloat(data.ReturnOnAssetsTTM) || 0,
        };

        setCache(cacheKey, overview, TTL_FUNDAMENTALS);
        return overview;
    } catch (e) {
        console.warn(`Alpha Vantage overview failed for ${ticker}:`, e);
        return null;
    }
}

export interface AVBalanceSheet {
    totalAssets: number;
    totalEquity: number;
    totalLiabilities: number;
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
    cashAndEquivalents: number;
    longTermDebt: number;
    totalReceivables: number;
    totalPayables: number;
}

export async function fetchAVBalanceSheet(ticker: string): Promise<AVBalanceSheet | null> {
    const cacheKey = `avbs_${ticker}`;
    const cached = getCached<AVBalanceSheet>(cacheKey);
    if (cached) return cached;

    try {
        const resp = await rateLimitedFetch(
            `${AV_BASE}/query?function=BALANCE_SHEET&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`,
            1200
        );
        if (!resp.ok) return null;
        const data = await resp.json();

        if (data.Information || data.Note || !data.annualReports?.length) return null;

        const r = data.annualReports[0]; // Most recent annual report
        const p = (v: string) => parseFloat(v) / 1e9 || 0;

        const bs: AVBalanceSheet = {
            totalAssets: p(r.totalAssets),
            totalEquity: p(r.totalShareholderEquity),
            totalLiabilities: p(r.totalLiabilities),
            currentAssets: p(r.totalCurrentAssets),
            currentLiabilities: p(r.totalCurrentLiabilities),
            inventory: p(r.inventory),
            cashAndEquivalents: p(r.cashAndCashEquivalentsAtCarryingValue || r.cashAndShortTermInvestments),
            longTermDebt: p(r.longTermDebt),
            totalReceivables: p(r.currentNetReceivables),
            totalPayables: p(r.currentAccountsPayable),
        };

        setCache(cacheKey, bs, TTL_FUNDAMENTALS);
        return bs;
    } catch (e) {
        console.warn(`AV balance sheet failed for ${ticker}:`, e);
        return null;
    }
}

export interface AVIncomeStatement {
    revenue: number;
    costOfGoodsSold: number;
    operatingIncome: number;
    netIncome: number;
    interestExpense: number;
    ebitda: number;
    taxExpense: number;
}

export async function fetchAVIncomeStatement(ticker: string): Promise<AVIncomeStatement | null> {
    const cacheKey = `avis_${ticker}`;
    const cached = getCached<AVIncomeStatement>(cacheKey);
    if (cached) return cached;

    try {
        const resp = await rateLimitedFetch(
            `${AV_BASE}/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`,
            1200
        );
        if (!resp.ok) return null;
        const data = await resp.json();

        if (data.Information || data.Note || !data.annualReports?.length) return null;

        const r = data.annualReports[0];
        const p = (v: string) => parseFloat(v) / 1e9 || 0;

        const is: AVIncomeStatement = {
            revenue: p(r.totalRevenue),
            costOfGoodsSold: p(r.costOfRevenue || r.costofGoodsAndServicesSold),
            operatingIncome: p(r.operatingIncome),
            netIncome: p(r.netIncome),
            interestExpense: p(r.interestExpense),
            ebitda: p(r.ebitda),
            taxExpense: p(r.incomeTaxExpense),
        };

        setCache(cacheKey, is, TTL_FUNDAMENTALS);
        return is;
    } catch (e) {
        console.warn(`AV income statement failed for ${ticker}:`, e);
        return null;
    }
}

// ─── Alpha Vantage Global Quote (real-time price) ─────────

export interface AVQuote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    latestTradingDay: string;
}

export async function fetchAVQuote(ticker: string): Promise<AVQuote | null> {
    const cacheKey = `avq_${ticker}`;
    const cached = getCached<AVQuote>(cacheKey);
    if (cached) return cached;

    try {
        const resp = await rateLimitedFetch(
            `${AV_BASE}/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`,
            1200
        );
        if (!resp.ok) return null;
        const data = await resp.json();

        if (data.Information || data.Note) return null;

        const gq = data["Global Quote"];
        if (!gq || !gq["01. symbol"]) return null;

        const quote: AVQuote = {
            symbol: gq["01. symbol"],
            price: parseFloat(gq["05. price"]) || 0,
            change: parseFloat(gq["09. change"]) || 0,
            changePercent: parseFloat(gq["10. change percent"]?.replace("%", "")) || 0,
            volume: parseFloat(gq["06. volume"]) || 0,
            latestTradingDay: gq["07. latest trading day"] || "",
        };

        setCache(cacheKey, quote, TTL_QUOTE);
        return quote;
    } catch (e) {
        console.warn(`AV quote failed for ${ticker}:`, e);
        return null;
    }
}

// ─── Composite: Fetch Full Company Data ───────────────────

export type DataSource = "live" | "cached" | "fallback";

export interface LiveCompanyResult {
    data: CompanyData;
    source: DataSource;
    lastUpdated: Date;
}

/**
 * Fetch live company data from Yahoo Finance + Alpha Vantage.
 * Falls back to the provided fallback data if APIs fail.
 */
export async function fetchLiveCompanyData(
    ticker: string,
    fallback: CompanyData
): Promise<LiveCompanyResult> {
    // Check composite cache first
    const cacheKey = `live_${ticker}`;
    const cached = getCached<LiveCompanyResult>(cacheKey);
    if (cached) return { ...cached, source: "cached" };

    try {
        // Fetch Yahoo quote + history in parallel
        const [yahooQuote, yahooHistory, avQuote] = await Promise.all([
            fetchYahooQuote(ticker),
            fetchYahooHistory(ticker, 365),
            fetchAVQuote(ticker),
        ]);

        // We need at least price data
        const price = yahooQuote?.regularMarketPrice
            || avQuote?.price
            || fallback.currentPrice;

        if (!yahooQuote && !avQuote) {
            return { data: fallback, source: "fallback", lastUpdated: new Date() };
        }

        // Merge data from all sources
        const data: CompanyData = {
            ...fallback, // Start with fallback for any missing fields

            // Price & market data (Yahoo primary, AV secondary)
            currentPrice: price,
            marketCap: fallback.marketCap, // Keep from seed unless AV provides
            beta: fallback.beta,
            sharesOutstanding: fallback.sharesOutstanding,

            // Returns from Yahoo history
            dailyReturns: yahooHistory?.dailyReturns ?? fallback.dailyReturns,
            annualReturn: yahooHistory?.annualReturn ?? fallback.annualReturn,
            annualVolatility: yahooHistory?.annualVolatility ?? fallback.annualVolatility,

            // Risk params recalculated from live vol
            assetVolatility: (yahooHistory?.annualVolatility ?? fallback.annualVolatility) * 0.6,
        };

        const result: LiveCompanyResult = {
            data,
            source: "live",
            lastUpdated: new Date(),
        };

        setCache(cacheKey, result, TTL_QUOTE);
        return result;
    } catch (e) {
        console.warn(`Live data fetch failed for ${ticker}, using fallback:`, e);
        return { data: fallback, source: "fallback", lastUpdated: new Date() };
    }
}

/**
 * Enrich company data with Alpha Vantage fundamentals.
 * Call this separately since AV has tight rate limits (25/day).
 */
export async function enrichWithFundamentals(
    ticker: string,
    current: CompanyData
): Promise<CompanyData> {
    const cacheKey = `enriched_${ticker}`;
    const cached = getCached<CompanyData>(cacheKey);
    if (cached) return cached;

    try {
        const [overview, balanceSheet, incomeStmt] = await Promise.all([
            fetchAVOverview(ticker),
            fetchAVBalanceSheet(ticker),
            fetchAVIncomeStatement(ticker),
        ]);

        const enriched: CompanyData = {
            ...current,
            // From overview
            ...(overview && {
                name: overview.Name || current.name,
                sector: overview.Sector || current.sector,
                marketCap: overview.MarketCapitalization || current.marketCap,
                beta: overview.Beta || current.beta,
                sharesOutstanding: overview.SharesOutstanding || current.sharesOutstanding,
            }),
            // From balance sheet
            ...(balanceSheet && {
                totalAssets: balanceSheet.totalAssets || current.totalAssets,
                totalEquity: balanceSheet.totalEquity || current.totalEquity,
                totalLiabilities: balanceSheet.totalLiabilities || current.totalLiabilities,
                currentAssets: balanceSheet.currentAssets || current.currentAssets,
                currentLiabilities: balanceSheet.currentLiabilities || current.currentLiabilities,
                inventory: balanceSheet.inventory || current.inventory,
                cashAndEquivalents: balanceSheet.cashAndEquivalents || current.cashAndEquivalents,
                longTermDebt: balanceSheet.longTermDebt || current.longTermDebt,
                totalReceivables: balanceSheet.totalReceivables || current.totalReceivables,
                totalPayables: balanceSheet.totalPayables || current.totalPayables,
                debtFaceValue: (balanceSheet.longTermDebt || current.longTermDebt) + (balanceSheet.currentLiabilities || current.currentLiabilities) * 0.3,
            }),
            // From income statement
            ...(incomeStmt && {
                revenue: incomeStmt.revenue || current.revenue,
                costOfGoodsSold: incomeStmt.costOfGoodsSold || current.costOfGoodsSold,
                operatingIncome: incomeStmt.operatingIncome || current.operatingIncome,
                netIncome: incomeStmt.netIncome || current.netIncome,
                interestExpense: incomeStmt.interestExpense || current.interestExpense,
                ebitda: incomeStmt.ebitda || current.ebitda,
                taxExpense: incomeStmt.taxExpense || current.taxExpense,
            }),
        };

        setCache(cacheKey, enriched, TTL_FUNDAMENTALS);
        return enriched;
    } catch (e) {
        console.warn(`Enrichment failed for ${ticker}:`, e);
        return current;
    }
}

// ─── Utilities ────────────────────────────────────────────

export function clearAllCache(): void {
    cache.clear();
}

export function getCacheStats(): { entries: number; keys: string[] } {
    return { entries: cache.size, keys: Array.from(cache.keys()) };
}
