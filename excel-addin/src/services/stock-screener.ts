/**
 * Stock Screener — Ticker Search & Predefined Lists
 *
 * Uses Yahoo Finance search API for autocomplete.
 * Includes curated lists for quick access.
 */

// ─── Predefined Ticker Lists ─────────────────────────────

export const SP500_TOP = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
    "JPM", "V", "UNH", "MA", "JNJ", "PG", "XOM", "HD", "BAC", "COST",
    "ABBV", "WMT", "KO", "PEP", "MRK", "AVGO", "LLY", "CRM", "TMO",
    "GS", "ORCL", "ACN",
];

export const NIFTY50_TOP = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS",
    "KOTAKBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "HCLTECH.NS", "WIPRO.NS",
];

export const ALL_PRESET_TICKERS = [...SP500_TOP, ...NIFTY50_TOP];

// Map for display names (without exchange suffix)
export function cleanTicker(ticker: string): string {
    return ticker.replace(/\.(NS|BSE|BO)$/i, "");
}

// ─── Yahoo Finance Search ─────────────────────────────────

export interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string; // EQUITY, ETF, INDEX, etc.
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 1) return [];

    try {
        const resp = await fetch(
            `/api/yahoo/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`,
            {
                headers: { "Accept": "application/json" },
                signal: AbortSignal.timeout(5000),
            }
        );
        if (!resp.ok) return [];

        const data = await resp.json();
        const quotes = data?.quotes ?? [];

        return quotes
            .filter((q: Record<string, string>) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
            .map((q: Record<string, string>) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchange || "",
                type: q.quoteType || "EQUITY",
            }));
    } catch (e) {
        console.warn("Ticker search failed:", e);
        return [];
    }
}

// ─── Curated Search (fallback when API is unavailable) ────

const TICKER_NAMES: Record<string, string> = {
    AAPL: "Apple Inc.", MSFT: "Microsoft Corp.", GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com Inc.", NVDA: "NVIDIA Corp.", META: "Meta Platforms",
    TSLA: "Tesla Inc.", "BRK-B": "Berkshire Hathaway", JPM: "JPMorgan Chase",
    V: "Visa Inc.", UNH: "UnitedHealth Group", MA: "Mastercard Inc.",
    JNJ: "Johnson & Johnson", PG: "Procter & Gamble", XOM: "Exxon Mobil",
    HD: "Home Depot", BAC: "Bank of America", COST: "Costco Wholesale",
    WMT: "Walmart Inc.", GS: "Goldman Sachs", KO: "Coca-Cola Co.",
    PEP: "PepsiCo Inc.", MRK: "Merck & Co.", LLY: "Eli Lilly",
    "RELIANCE.NS": "Reliance Industries", "TCS.NS": "Tata Consultancy",
    "HDFCBANK.NS": "HDFC Bank", "INFY.NS": "Infosys Ltd.",
    "ICICIBANK.NS": "ICICI Bank", "HINDUNILVR.NS": "Hindustan Unilever",
    "SBIN.NS": "State Bank of India", "BHARTIARTL.NS": "Bharti Airtel",
    "ITC.NS": "ITC Ltd.", "LT.NS": "Larsen & Toubro",
};

export function searchLocal(query: string): SearchResult[] {
    const q = query.toUpperCase();
    return ALL_PRESET_TICKERS
        .filter(t => t.includes(q) || (TICKER_NAMES[t]?.toUpperCase().includes(q) ?? false))
        .slice(0, 8)
        .map(t => ({
            symbol: t,
            name: TICKER_NAMES[t] || t,
            exchange: t.endsWith(".NS") ? "NSE" : "NASDAQ/NYSE",
            type: "EQUITY",
        }));
}
