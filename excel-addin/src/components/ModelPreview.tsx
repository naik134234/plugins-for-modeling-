import React, { useState } from "react";
import { CompanyData } from "../data/financial-data";

const f = (v: number, d = 2) => v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fp = (v: number) => `${(v * 100).toFixed(1)}%`;
const fm = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type Row = [string, string | number] | string;

const Table = ({ rows }: { rows: Row[] }) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <tbody>
            {rows.map((r, i) =>
                typeof r === "string" ? (
                    <tr key={i}>
                        <td colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, fontSize: 11, color: "#58a6ff", background: "#1a1b4b", borderBottom: "1px solid #30363d" }}>{r}</td>
                    </tr>
                ) : (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22" }}>
                        <td style={{ padding: "3px 8px", color: "#8b949e" }}>{r[0]}</td>
                        <td style={{ padding: "3px 8px", textAlign: "right", color: "#e6edf3", fontWeight: 500 }}>
                            {typeof r[1] === "number" ? f(r[1]) : r[1]}
                        </td>
                    </tr>
                )
            )}
        </tbody>
    </table>
);

const PTABS = [
    { id: "overview", label: "📊 Overview" },
    { id: "bs", label: "📋 Balance" },
    { id: "is", label: "📈 Income" },
    { id: "dcf", label: "🏦 DCF" },
    { id: "ratios", label: "📐 Ratios" },
    { id: "wacc", label: "⚖️ WACC" },
    { id: "loan", label: "🏠 Loan" },
];

const ModelPreview: React.FC<{ co: CompanyData }> = ({ co }) => {
    const [tab, setTab] = useState("overview");
    const rev = co.revenue || 1;
    const gp = co.revenue - co.costOfGoodsSold;
    const opEx = gp - co.operatingIncome;
    const ebt = co.operatingIncome - co.interestExpense;
    const da = co.ebitda - co.operatingIncome;
    const ncAssets = co.totalAssets - co.currentAssets;
    const netDebt = co.longTermDebt - co.cashAndEquivalents;
    const wacc = co.beta * 0.05 + 0.03;
    const tgr = 0.025;

    // FCF projections
    const fcfs: { year: number; fcf: number; pv: number; gr: number }[] = [];
    let prevFcf = co.freeCashFlow;
    for (let y = 0; y < 5; y++) {
        const gr = co.fcfGrowthRates[y] || 0.05;
        prevFcf *= (1 + gr);
        const df = 1 / Math.pow(1 + wacc, y + 1);
        fcfs.push({ year: y + 1, fcf: prevFcf, pv: prevFcf * df, gr });
    }
    const sumPV = fcfs.reduce((a, b) => a + b.pv, 0);
    const tv = prevFcf * (1 + tgr) / (wacc - tgr);
    const pvTV = tv / Math.pow(1 + wacc, 5);
    const ev = sumPV + pvTV;
    const eqVal = ev - netDebt;
    const sharePrice = eqVal * 1000 / (co.sharesOutstanding || 1);

    // WACC
    const rf = 0.04, mr = 0.10;
    const codPre = co.interestExpense / (co.longTermDebt || 1);
    const taxRate = Math.min(Math.abs(co.taxExpense / ((co.operatingIncome - co.interestExpense) || 1)), 0.40);
    const totalCap = co.marketCap + co.longTermDebt;
    const ew = co.marketCap / (totalCap || 1);
    const dw = co.longTermDebt / (totalCap || 1);
    const coe = rf + co.beta * (mr - rf);
    const atCod = codPre * (1 - taxRate);
    const waccCalc = ew * coe + dw * atCod;

    // Loan
    const loanP = co.longTermDebt;
    const loanR = Math.max(codPre, 0.03);
    const monthlyR = loanR / 12;
    const termMonths = 120;
    const pmt = loanP > 0 ? loanP * monthlyR / (1 - Math.pow(1 + monthlyR, -termMonths)) : 0;
    const totalInt = pmt * termMonths - loanP;

    const content: Record<string, Row[]> = {
        overview: [
            "📊 Key Market Metrics",
            ["Current Price", fm(co.currentPrice)],
            ["Market Cap ($B)", f(co.marketCap, 1)],
            ["Beta", f(co.beta)],
            ["Shares Outstanding (M)", f(co.sharesOutstanding, 0)],
            ["Annual Return", fp(co.annualReturn)],
            ["Annual Volatility", fp(co.annualVolatility)],
            "📈 Financial Summary ($B)",
            ["Revenue", f(co.revenue, 1)],
            ["COGS", f(co.costOfGoodsSold, 1)],
            ["Gross Profit", f(gp, 1)],
            ["Operating Income", f(co.operatingIncome, 1)],
            ["EBITDA", f(co.ebitda, 1)],
            ["Net Income", f(co.netIncome, 1)],
            ["Free Cash Flow", f(co.freeCashFlow, 1)],
            "🏦 Balance Sheet Summary ($B)",
            ["Total Assets", f(co.totalAssets, 1)],
            ["Total Equity", f(co.totalEquity, 1)],
            ["Total Liabilities", f(co.totalLiabilities, 1)],
            ["D/E Ratio", f(co.totalLiabilities / (co.totalEquity || 1))],
            ["Cash", f(co.cashAndEquivalents, 1)],
            ["Long-Term Debt", f(co.longTermDebt, 1)],
        ],
        bs: [
            "CURRENT ASSETS ($B)",
            ["Cash & Equivalents", f(co.cashAndEquivalents)],
            ["Receivables", f(co.totalReceivables)],
            ["Inventory", f(co.inventory)],
            ["Total Current Assets", f(co.currentAssets)],
            "NON-CURRENT ASSETS ($B)",
            ["PP&E and Other", f(ncAssets)],
            ["TOTAL ASSETS", f(co.totalAssets)],
            "CURRENT LIABILITIES ($B)",
            ["Accounts Payable", f(co.totalPayables)],
            ["Other Current", f(co.currentLiabilities - co.totalPayables)],
            ["Total Current Liabilities", f(co.currentLiabilities)],
            "NON-CURRENT LIABILITIES ($B)",
            ["Long-Term Debt", f(co.longTermDebt)],
            ["Other Non-Current", f(co.totalLiabilities - co.currentLiabilities - co.longTermDebt)],
            ["TOTAL LIABILITIES", f(co.totalLiabilities)],
            "EQUITY ($B)",
            ["Total Equity", f(co.totalEquity)],
            ["Total L+E", f(co.totalLiabilities + co.totalEquity)],
            ["✅ Balance Check", f(co.totalAssets - co.totalLiabilities - co.totalEquity)],
        ],
        is: [
            "INCOME STATEMENT ($B)",
            ["Revenue", `${f(co.revenue)} (100.0%)`],
            ["(-) COGS", `(${f(co.costOfGoodsSold)}) — ${fp(co.costOfGoodsSold / rev)}`],
            ["Gross Profit", `${f(gp)} — ${fp(gp / rev)}`],
            ["(-) OpEx", `(${f(opEx)}) — ${fp(opEx / rev)}`],
            ["Operating Income", `${f(co.operatingIncome)} — ${fp(co.operatingIncome / rev)}`],
            ["(-) Interest", f(-co.interestExpense)],
            ["EBT", f(ebt)],
            ["(-) Tax", `(${f(co.taxExpense)}) — ${fp(co.taxExpense / (ebt || 1))}`],
            ["NET INCOME", `${f(co.netIncome)} — ${fp(co.netIncome / rev)}`],
            "EBITDA RECONCILIATION",
            ["Operating Income", f(co.operatingIncome)],
            ["(+) D&A", f(da)],
            ["EBITDA", f(co.ebitda)],
        ],
        dcf: [
            "📝 ASSUMPTIONS",
            ["Base FCF ($B)", f(co.freeCashFlow)],
            ["WACC", fp(wacc)],
            ["Terminal Growth", fp(tgr)],
            ["Shares Outstanding (M)", f(co.sharesOutstanding, 0)],
            ["Net Debt ($B)", f(netDebt)],
            "📊 FCF PROJECTIONS ($B)",
            ...fcfs.map(fc => [`Year ${fc.year} (${fp(fc.gr)})`, `FCF: ${f(fc.fcf)} | PV: ${f(fc.pv)}`] as [string, string]),
            "💰 VALUATION",
            ["Terminal Value ($B)", f(tv)],
            ["PV of Terminal Value ($B)", f(pvTV)],
            ["Sum PV of FCFs ($B)", f(sumPV)],
            ["ENTERPRISE VALUE ($B)", f(ev)],
            ["(-) Net Debt ($B)", f(netDebt)],
            ["EQUITY VALUE ($B)", f(eqVal)],
            ["IMPLIED SHARE PRICE", fm(sharePrice)],
            ["Current Price", fm(co.currentPrice)],
            ["Upside/Downside", fp((sharePrice - co.currentPrice) / (co.currentPrice || 1))],
        ],
        ratios: [
            "💧 Liquidity",
            ["Current Ratio", f(co.currentAssets / (co.currentLiabilities || 1))],
            ["Quick Ratio", f((co.currentAssets - co.inventory) / (co.currentLiabilities || 1))],
            ["Cash Ratio", f(co.cashAndEquivalents / (co.currentLiabilities || 1))],
            "💰 Profitability",
            ["Gross Margin", fp(gp / rev)],
            ["Operating Margin", fp(co.operatingIncome / rev)],
            ["Net Margin", fp(co.netIncome / rev)],
            ["EBITDA Margin", fp(co.ebitda / rev)],
            ["ROE", fp(co.netIncome / (co.totalEquity || 1))],
            ["ROA", fp(co.netIncome / (co.totalAssets || 1))],
            "⚖️ Leverage",
            ["Debt-to-Equity", f(co.totalLiabilities / (co.totalEquity || 1))],
            ["Debt-to-Assets", f(co.totalLiabilities / (co.totalAssets || 1))],
            ["Interest Coverage", `${f(co.operatingIncome / (co.interestExpense || 1))}x`],
            ["LT Debt/Equity", f(co.longTermDebt / (co.totalEquity || 1))],
            "🔬 DuPont Analysis",
            ["Net Profit Margin", fp(co.netIncome / rev)],
            ["× Asset Turnover", f(co.revenue / (co.totalAssets || 1))],
            ["× Equity Multiplier", f(co.totalAssets / (co.totalEquity || 1))],
            ["= ROE (DuPont)", fp((co.netIncome / rev) * (co.revenue / (co.totalAssets || 1)) * (co.totalAssets / (co.totalEquity || 1)))],
        ],
        wacc: [
            "📝 INPUTS",
            ["Risk-Free Rate", fp(rf)],
            ["Market Return", fp(mr)],
            ["Beta", f(co.beta)],
            ["Cost of Debt (pre-tax)", fp(codPre)],
            ["Tax Rate", fp(taxRate)],
            ["Equity Value ($B)", f(co.marketCap, 1)],
            ["Debt Value ($B)", f(co.longTermDebt, 1)],
            "📊 CALCULATIONS",
            ["Total Capital ($B)", f(totalCap, 1)],
            ["Equity Weight", fp(ew)],
            ["Debt Weight", fp(dw)],
            ["Cost of Equity (CAPM)", fp(coe)],
            ["After-Tax Cost of Debt", fp(atCod)],
            "⚖️ RESULT",
            ["WACC", fp(waccCalc)],
        ],
        loan: [
            "📝 LOAN PARAMETERS",
            ["Principal ($B)", f(loanP)],
            ["Annual Rate", fp(loanR)],
            ["Term (Years)", "10"],
            "📊 SUMMARY",
            ["Monthly Payment ($B)", f(pmt, 4)],
            ["Total Interest ($B)", f(totalInt)],
            ["Total Payment ($B)", f(pmt * termMonths)],
        ],
    };

    return (
        <div className="glass-card" style={{ marginTop: 8 }}>
            <h3 className="card-title"><span className="icon">📋</span> Financial Model — {co.ticker}</h3>
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 8 }}>
                {PTABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "4px 8px", fontSize: 10, borderRadius: 4, cursor: "pointer",
                        background: tab === t.id ? "#7c3aed" : "#21262d",
                        color: tab === t.id ? "#fff" : "#8b949e",
                        border: `1px solid ${tab === t.id ? "#7c3aed" : "#30363d"}`,
                        fontWeight: tab === t.id ? 700 : 400,
                    }}>{t.label}</button>
                ))}
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto", borderRadius: 6, border: "1px solid #21262d" }}>
                <Table rows={content[tab] || []} />
            </div>
        </div>
    );
};

export default ModelPreview;
