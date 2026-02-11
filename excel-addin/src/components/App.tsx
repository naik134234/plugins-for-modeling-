import React, { useState, useEffect } from "react";
import "../styles/global.css";

// Engines
import { calculateVaR, VaRResult } from "../engines/var-engine";
import { calculateMerton, MertonResult } from "../engines/credit-risk-engine";
import { runMonteCarlo, MCResult, SimulationParameter } from "../engines/monte-carlo-engine";
import { runSensitivity, SensitivityResult } from "../engines/sensitivity-engine";
import { calculateCapitalBudgeting, CapBudgetResult } from "../engines/capital-budgeting-engine";
import { calculateDCF, DCFResult } from "../engines/dcf-engine";
import { calculateWACC, WACCResult } from "../engines/wacc-engine";
import { calculateBlackScholes, OptionsResult } from "../engines/options-engine";
import { calculateBond, BondResult } from "../engines/bond-engine";
import { optimizePortfolio, PortfolioResult } from "../engines/portfolio-engine";
import { calculateRatios, RatiosResult } from "../engines/ratios-engine";
import { calculateLoan, LoanResult } from "../engines/loan-engine";

// Data
import { COMPANIES, CompanyData } from "../data/financial-data";
import { getConnectionStatus, onStatusChange, startHealthCheck, ConnectionStatus } from "../services/api";

// Excel
// ExcelService will be used for export features
// import { ExcelService } from "../utils/excel";

// ──────── Types ──────── 
type TabId = "dashboard" | "var" | "credit" | "mc" | "sens" | "capbudget" | "dcf" | "options" | "bonds" | "portfolio";

const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "dashboard", label: "Home", icon: "📊" },
    { id: "var", label: "VaR", icon: "📉" },
    { id: "credit", label: "Credit", icon: "🏛️" },
    { id: "mc", label: "Monte Carlo", icon: "🎲" },
    { id: "sens", label: "Sensitivity", icon: "📈" },
    { id: "capbudget", label: "CapBudget", icon: "💰" },
    { id: "dcf", label: "DCF", icon: "🏦" },
    { id: "options", label: "Options", icon: "⚡" },
    { id: "bonds", label: "Bonds", icon: "📜" },
    { id: "portfolio", label: "Portfolio", icon: "🎯" },
];

// ──────── Helpers ──────── 
const fmt = (v: number | null | undefined, d = 2) => v !== null && v !== undefined ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "N/A";
const fmtPct = (v: number | null | undefined, d = 2) => v !== null && v !== undefined ? `${(v * 100).toFixed(d)}%` : "N/A";
const fmtMoney = (v: number | null | undefined) => v !== null && v !== undefined ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";

// ──────── App Component ──────── 
const App: React.FC = () => {
    const [tab, setTab] = useState<TabId>("dashboard");
    const [company, setCompany] = useState<string>("AAPL");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [connStatus, setConnStatus] = useState<ConnectionStatus>("offline");

    useEffect(() => {
        try { Office.onReady(() => { }); } catch { /* not in Office */ }
        // Start health check to detect backend
        startHealthCheck();
        setConnStatus(getConnectionStatus());
        const unsub = onStatusChange(s => setConnStatus(s));
        return unsub;
    }, []);

    const selectedCompany = COMPANIES.find(c => c.ticker === company) || COMPANIES[0];

    const clearError = () => setError("");
    const handleError = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

    // ═══ Company Selector ═══
    const CompanySelector = ({ onChange }: { onChange?: (c: CompanyData) => void }) => (
        <div className="company-selector">
            <div className="form-group">
                <label className="form-label">Company</label>
                <select className="form-select" value={company} onChange={e => {
                    setCompany(e.target.value);
                    const c = COMPANIES.find(x => x.ticker === e.target.value);
                    if (c && onChange) onChange(c);
                }}>
                    {COMPANIES.map(c => (
                        <option key={c.ticker} value={c.ticker}>{c.ticker} — {c.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );

    // ═══ Histogram ═══ 
    const Histogram = ({ bins, frequencies }: { bins: number[]; frequencies: number[] }) => {
        const max = Math.max(...frequencies, 1);
        return (
            <div className="histogram">
                {frequencies.map((f, i) => (
                    <div key={i} className="histogram-bar" style={{ height: `${(f / max) * 100}%` }} title={`${bins[i]?.toFixed(1)}: ${f}`} />
                ))}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Dashboard
    // ═══════════════════════════════════════════════════════════
    const DashboardTab = () => (
        <>
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">⚡</span> Risk Modeling Platform</h3>
                <p className="card-subtitle">Enterprise-grade financial analytics — all computations run locally, no server needed.</p>
                <div className="dashboard-grid">
                    <div className="stat-card" onClick={() => setTab("var")}><div className="stat-value">3</div><div className="stat-label">VaR Methods</div></div>
                    <div className="stat-card" onClick={() => setTab("options")}><div className="stat-value">5</div><div className="stat-label">Option Greeks</div></div>
                    <div className="stat-card" onClick={() => setTab("mc")}><div className="stat-value">5</div><div className="stat-label">Distributions</div></div>
                    <div className="stat-card" onClick={() => setTab("portfolio")}><div className="stat-value">{COMPANIES.length}</div><div className="stat-label">Companies</div></div>
                </div>
            </div>
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">🏢</span> Quick Company View</h3>
                <CompanySelector />
                <div className="result-panel">
                    <div className="result-grid">
                        <RI label="Sector" value={selectedCompany.sector} />
                        <RI label="Exchange" value={selectedCompany.exchange} />
                        <RI label="Market Cap" value={`$${selectedCompany.marketCap}B`} />
                        <RI label="Beta" value={fmt(selectedCompany.beta)} />
                        <RI label="Annual Return" value={fmtPct(selectedCompany.annualReturn)} cls="positive" />
                        <RI label="Volatility" value={fmtPct(selectedCompany.annualVolatility)} />
                        <RI label="Revenue" value={`$${selectedCompany.revenue}B`} />
                        <RI label="Net Income" value={`$${selectedCompany.netIncome}B`} cls="positive" />
                    </div>
                </div>
            </div>
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">🔧</span> Modeling Modules</h3>
                <div style={{ display: "grid", gap: "4px" }}>
                    {TABS.filter(t => t.id !== "dashboard").map(t => (
                        <button key={t.id} className="btn-secondary" onClick={() => setTab(t.id)} style={{ textAlign: "left" }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );

    // ═══════════════════════════════════════════════════════════
    // TAB: VaR
    // ═══════════════════════════════════════════════════════════
    const VaRTab = () => {
        const [method, setMethod] = useState<"historical" | "parametric" | "monte_carlo">("historical");
        const [portValue, setPortValue] = useState("1000000");
        const [conf, setConf] = useState("0.95");
        const [horizon, setHorizon] = useState("1");
        const [result, setResult] = useState<VaRResult | null>(null);

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                const r = calculateVaR({
                    returns: selectedCompany.dailyReturns,
                    portfolioValue: parseFloat(portValue),
                    confidenceLevel: parseFloat(conf),
                    timeHorizon: parseInt(horizon),
                    method,
                    numSimulations: 10000,
                });
                setResult(r);
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        return (
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">📉</span> Value at Risk</h3>
                <p className="card-subtitle">Using {selectedCompany.ticker} — {selectedCompany.dailyReturns.length} days of data</p>
                <CompanySelector />
                <div className="form-row">
                    <FG label="Portfolio Value ($)" value={portValue} onChange={setPortValue} type="number" />
                    <FG label="Confidence" value={conf} onChange={setConf} type="number" />
                </div>
                <div className="form-row">
                    <FG label="Time Horizon (days)" value={horizon} onChange={setHorizon} type="number" />
                    <div className="form-group">
                        <label className="form-label">Method</label>
                        <select className="form-select" value={method} onChange={e => setMethod(e.target.value as typeof method)}>
                            <option value="historical">Historical</option>
                            <option value="parametric">Parametric</option>
                            <option value="monte_carlo">Monte Carlo</option>
                        </select>
                    </div>
                </div>
                <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Calculate VaR"}</button>
                {result && (
                    <div className="result-panel">
                        <div className="result-title">📊 {result.varMethod} VaR — {result.confidenceLevel}</div>
                        <div className="result-grid">
                            <RI label="VaR (Absolute)" value={fmtMoney(result.varAbsolute)} cls="negative" />
                            <RI label="Expected Shortfall" value={fmtMoney(result.expectedShortfall)} cls="negative" />
                            <RI label="VaR (%)" value={`${result.varPercentage}%`} />
                            <RI label="Data Points" value={String(result.dataPointsUsed)} />
                            {result.dailyVolatility !== undefined && <RI label="Daily Vol" value={`${result.dailyVolatility}%`} />}
                            {result.annualizedVolatility !== undefined && <RI label="Annual Vol" value={`${result.annualizedVolatility}%`} />}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Credit Risk
    // ═══════════════════════════════════════════════════════════
    const CreditTab = () => {
        const [assetV, setAssetV] = useState(String(selectedCompany.totalAssets));
        const [debtV, setDebtV] = useState(String(selectedCompany.debtFaceValue));
        const [rf, setRf] = useState("0.05");
        const [vol, setVol] = useState(String(selectedCompany.assetVolatility));
        const [mat, setMat] = useState("1");
        const [result, setResult] = useState<MertonResult | null>(null);

        const populate = (c: CompanyData) => { setAssetV(String(c.totalAssets)); setDebtV(String(c.debtFaceValue)); setVol(String(c.assetVolatility)); };

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                setResult(calculateMerton({ assetValue: parseFloat(assetV), debtFaceValue: parseFloat(debtV), riskFreeRate: parseFloat(rf), volatility: parseFloat(vol), timeToMaturity: parseFloat(mat) }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        return (
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">🏛️</span> Merton Credit Model</h3>
                <p className="card-subtitle">Structural model for probability of default</p>
                <CompanySelector onChange={populate} />
                <div className="form-row">
                    <FG label="Asset Value (V)" value={assetV} onChange={setAssetV} type="number" />
                    <FG label="Debt Face Value (D)" value={debtV} onChange={setDebtV} type="number" />
                </div>
                <div className="form-row-3">
                    <FG label="Volatility (σ)" value={vol} onChange={setVol} type="number" />
                    <FG label="Risk-Free Rate" value={rf} onChange={setRf} type="number" />
                    <FG label="Maturity (T)" value={mat} onChange={setMat} type="number" />
                </div>
                <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Calculate Credit Risk"}</button>
                {result && (
                    <div className="result-panel">
                        <div className="result-title">📊 Merton Model Results</div>
                        <div className="result-grid">
                            <RI label="Default Probability" value={`${(result.probabilityOfDefault * 100).toFixed(4)}%`} cls={result.probabilityOfDefault > 0.05 ? "negative" : "positive"} />
                            <RI label="Distance to Default" value={fmt(result.distanceToDefault, 4)} cls="accent" />
                            <RI label="Equity Value" value={fmtMoney(result.equityValue)} />
                            <RI label="Debt Value" value={fmtMoney(result.debtValue)} />
                            <RI label="Credit Spread" value={`${(result.impliedCreditSpread * 10000).toFixed(1)} bps`} />
                            <RI label="d2" value={fmt(result.d2, 4)} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Monte Carlo
    // ═══════════════════════════════════════════════════════════
    const MonteCarloTab = () => {
        const [numSim, setNumSim] = useState("10000");
        const [dist, setDist] = useState<SimulationParameter["distribution"]>("normal");
        const [mean, setMean] = useState("100");
        const [std, setStd] = useState("15");
        const [minV, setMinV] = useState("50");
        const [maxV, setMaxV] = useState("150");
        const [modeV, setModeV] = useState("100");
        const [result, setResult] = useState<MCResult | null>(null);

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                const param: SimulationParameter = { name: "X", distribution: dist, mean: parseFloat(mean), stdDev: parseFloat(std), minVal: parseFloat(minV), maxVal: parseFloat(maxV), modeVal: parseFloat(modeV) };
                setResult(runMonteCarlo({ numSimulations: parseInt(numSim), parameters: [param] }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        return (
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">🎲</span> Monte Carlo Simulation</h3>
                <p className="card-subtitle">Run probabilistic simulations with various distributions</p>
                <div className="form-row">
                    <FG label="Simulations" value={numSim} onChange={setNumSim} type="number" />
                    <div className="form-group">
                        <label className="form-label">Distribution</label>
                        <select className="form-select" value={dist} onChange={e => setDist(e.target.value as SimulationParameter["distribution"])}>
                            <option value="normal">Normal</option>
                            <option value="lognormal">LogNormal</option>
                            <option value="uniform">Uniform</option>
                            <option value="triangular">Triangular</option>
                            <option value="pert">PERT</option>
                        </select>
                    </div>
                </div>
                {(dist === "normal" || dist === "lognormal") && (
                    <div className="form-row"><FG label="Mean" value={mean} onChange={setMean} type="number" /><FG label="Std Dev" value={std} onChange={setStd} type="number" /></div>
                )}
                {(dist === "uniform" || dist === "triangular" || dist === "pert") && (
                    <div className="form-row-3"><FG label="Min" value={minV} onChange={setMinV} type="number" /><FG label="Mode" value={modeV} onChange={setModeV} type="number" /><FG label="Max" value={maxV} onChange={setMaxV} type="number" /></div>
                )}
                <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Run Simulation"}</button>
                {result && (
                    <div className="result-panel">
                        <div className="result-title">📊 Simulation Results — {fmt(result.stats.numSimulations, 0)} runs</div>
                        <div className="chart-container">
                            <Histogram bins={result.histogram.bins} frequencies={result.histogram.frequencies} />
                        </div>
                        <div className="result-grid">
                            <RI label="Mean" value={fmt(result.stats.mean)} cls="accent" />
                            <RI label="Std Dev" value={fmt(result.stats.stdDev)} />
                            <RI label="Median" value={fmt(result.stats.median)} />
                            <RI label="CV" value={`${result.stats.coefficientOfVariation}%`} />
                            <RI label="P5" value={fmt(result.stats.percentile5)} />
                            <RI label="P95" value={fmt(result.stats.percentile95)} />
                            <RI label="P(Negative)" value={`${result.stats.probNegative}%`} cls={result.stats.probNegative > 50 ? "negative" : "positive"} />
                            <RI label="Range" value={fmt(result.stats.range)} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Sensitivity
    // ═══════════════════════════════════════════════════════════
    const SensitivityTab = () => {
        const [param, setParam] = useState("asset_value");
        const [minV, setMinV] = useState("50");
        const [maxV, setMaxV] = useState("500");
        const [steps, setSteps] = useState("10");
        const [result, setResult] = useState<SensitivityResult | null>(null);

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                const baseInputs: Record<string, number> = {
                    asset_value: selectedCompany.totalAssets,
                    debt_face_value: selectedCompany.debtFaceValue,
                    risk_free_rate: 0.05,
                    volatility: selectedCompany.assetVolatility,
                    time_to_maturity: 1,
                };
                const model = (inputs: Record<string, number>) => {
                    const r = calculateMerton({ assetValue: inputs.asset_value, debtFaceValue: inputs.debt_face_value, riskFreeRate: inputs.risk_free_rate, volatility: inputs.volatility, timeToMaturity: inputs.time_to_maturity });
                    return r.probabilityOfDefault;
                };
                setResult(runSensitivity({ baseInputs, targetParameter: param, minValue: parseFloat(minV), maxValue: parseFloat(maxV), steps: parseInt(steps), modelFunction: model }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        return (
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">📈</span> Sensitivity Analysis</h3>
                <p className="card-subtitle">How does PD change with input variations? ({selectedCompany.ticker})</p>
                <CompanySelector />
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Parameter</label>
                        <select className="form-select" value={param} onChange={e => setParam(e.target.value)}>
                            <option value="asset_value">Asset Value</option>
                            <option value="volatility">Volatility</option>
                            <option value="debt_face_value">Debt Face Value</option>
                            <option value="risk_free_rate">Risk-Free Rate</option>
                            <option value="time_to_maturity">Time to Maturity</option>
                        </select>
                    </div>
                    <FG label="Steps" value={steps} onChange={setSteps} type="number" />
                </div>
                <div className="form-row">
                    <FG label="Min Value" value={minV} onChange={setMinV} type="number" />
                    <FG label="Max Value" value={maxV} onChange={setMaxV} type="number" />
                </div>
                <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Run Sensitivity"}</button>
                {result && (
                    <div className="result-panel">
                        <div className="result-title">📊 {result.parameter} — Elasticity: {result.elasticity}</div>
                        <div className="chart-container">
                            {result.outputs.map((o, i) => {
                                const maxO = Math.max(...result.outputs.map(Math.abs), 0.001);
                                return (
                                    <div key={i} className="chart-bar-row">
                                        <span className="chart-bar-label">{fmt(result.values[i], 1)}</span>
                                        <div className={`chart-bar ${o > result.baseOutput ? "danger" : "success"}`} style={{ width: `${(Math.abs(o) / maxO) * 100}%` }} />
                                        <span className="chart-bar-value">{(o * 100).toFixed(3)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Capital Budgeting
    // ═══════════════════════════════════════════════════════════
    const CapBudgetTab = () => {
        const [rate, setRate] = useState("0.10");
        const [cfs, setCfs] = useState("-100000,30000,35000,40000,45000,50000");
        const [result, setResult] = useState<CapBudgetResult | null>(null);

        // Loan sub-section
        const [loanP, setLoanP] = useState("500000");
        const [loanR, setLoanR] = useState("0.08");
        const [loanT, setLoanT] = useState("240");
        const [loanResult, setLoanResult] = useState<LoanResult | null>(null);

        const calcCB = () => {
            clearError();
            try {
                setLoading(true);
                const cashFlows = cfs.split(",").map(s => parseFloat(s.trim()));
                setResult(calculateCapitalBudgeting({ cashFlows, discountRate: parseFloat(rate) }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        const calcLoan = () => {
            clearError();
            try {
                setLoanResult(calculateLoan({ principal: parseFloat(loanP), annualRate: parseFloat(loanR), termMonths: parseInt(loanT) }));
            } catch (e) { handleError(e); }
        };

        return (
            <>
                <div className="glass-card">
                    <h3 className="card-title"><span className="icon">💰</span> Capital Budgeting</h3>
                    <p className="card-subtitle">NPV, IRR, Payback Period, Profitability Index</p>
                    <FG label="Cash Flows (comma-sep, include initial neg)" value={cfs} onChange={setCfs} />
                    <FG label="Discount Rate (r)" value={rate} onChange={setRate} type="number" />
                    <button className="btn-primary" onClick={calcCB} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Calculate"}</button>
                    {result && (
                        <div className="result-panel">
                            <div className="result-title">📊 Investment Analysis</div>
                            <div className="result-grid">
                                <RI label="NPV" value={fmtMoney(result.npv)} cls={result.npv >= 0 ? "positive" : "negative"} />
                                <RI label="IRR" value={result.irr !== null ? `${(result.irr * 100).toFixed(2)}%` : "N/A"} cls="accent" />
                                <RI label="Payback" value={result.paybackPeriod !== null ? `${result.paybackPeriod} yrs` : "N/A"} />
                                <RI label="Profitability Index" value={fmt(result.profitabilityIndex, 4)} />
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Period</th><th>Cash Flow</th><th>PV</th><th>Cumulative</th></tr></thead>
                                <tbody>{result.cashFlowSummary.map(r => (
                                    <tr key={r.period}><td>{r.period}</td><td>{fmtMoney(r.cashFlow)}</td><td>{fmtMoney(r.pvCashFlow)}</td><td style={{ color: r.cumulative >= 0 ? "var(--success)" : "var(--danger)" }}>{fmtMoney(r.cumulative)}</td></tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="glass-card">
                    <h3 className="card-title"><span className="icon">🏠</span> Loan Amortization</h3>
                    <div className="form-row-3">
                        <FG label="Principal ($)" value={loanP} onChange={setLoanP} type="number" />
                        <FG label="Annual Rate" value={loanR} onChange={setLoanR} type="number" />
                        <FG label="Term (months)" value={loanT} onChange={setLoanT} type="number" />
                    </div>
                    <button className="btn-primary" onClick={calcLoan}>Calculate Loan</button>
                    {loanResult && (
                        <div className="result-panel">
                            <div className="result-title">📊 Loan Summary</div>
                            <div className="result-grid">
                                <RI label="Monthly EMI" value={fmtMoney(loanResult.monthlyPayment)} cls="accent" />
                                <RI label="Total Interest" value={fmtMoney(loanResult.totalInterest)} cls="negative" />
                                <RI label="Total Payment" value={fmtMoney(loanResult.totalPayment)} />
                                <RI label="Interest/Principal" value={fmtPct(loanResult.effectiveRate)} />
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: DCF Valuation
    // ═══════════════════════════════════════════════════════════
    const DCFTab = () => {
        const [fcf, setFcf] = useState(String(selectedCompany.freeCashFlow));
        const [tgr, setTgr] = useState("0.03");
        const [wacc, setWacc] = useState("0.10");
        const [debt, setDebt] = useState(String(selectedCompany.longTermDebt));
        const [shares, setShares] = useState(String(selectedCompany.sharesOutstanding));
        const [result, setResult] = useState<DCFResult | null>(null);

        // WACC sub-calc
        const [waccResult, setWaccResult] = useState<WACCResult | null>(null);

        const populate = (c: CompanyData) => { setFcf(String(c.freeCashFlow)); setDebt(String(c.longTermDebt)); setShares(String(c.sharesOutstanding)); };

        const calcDCF = () => {
            clearError();
            try {
                setLoading(true);
                setResult(calculateDCF({
                    currentFCF: parseFloat(fcf), growthRates: selectedCompany.fcfGrowthRates,
                    terminalGrowthRate: parseFloat(tgr), wacc: parseFloat(wacc),
                    netDebt: parseFloat(debt), sharesOutstanding: parseFloat(shares), exitMultiple: 15
                }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        const calcWACC = () => {
            try {
                setWaccResult(calculateWACC({
                    riskFreeRate: 0.04, marketReturn: 0.10, beta: selectedCompany.beta,
                    equityMarketValue: selectedCompany.marketCap, debtMarketValue: selectedCompany.longTermDebt,
                    costOfDebt: 0.05, taxRate: 0.25,
                }));
            } catch (e) { handleError(e); }
        };

        return (
            <>
                <div className="glass-card">
                    <h3 className="card-title"><span className="icon">🏦</span> DCF Valuation</h3>
                    <p className="card-subtitle">Intrinsic value via discounted free cash flows</p>
                    <CompanySelector onChange={populate} />
                    <div className="form-row-3">
                        <FG label="Current FCF ($B)" value={fcf} onChange={setFcf} type="number" />
                        <FG label="Terminal Growth" value={tgr} onChange={setTgr} type="number" />
                        <FG label="WACC" value={wacc} onChange={setWacc} type="number" />
                    </div>
                    <div className="form-row">
                        <FG label="Net Debt ($B)" value={debt} onChange={setDebt} type="number" />
                        <FG label="Shares (M)" value={shares} onChange={setShares} type="number" />
                    </div>
                    <button className="btn-primary" onClick={calcDCF} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Run DCF Valuation"}</button>
                    {result && (
                        <div className="result-panel">
                            <div className="result-title">📊 Valuation Summary</div>
                            <div className="result-grid">
                                <RI label="EV (Gordon)" value={`$${result.enterpriseValueGordon}B`} cls="accent" />
                                <RI label="EV (Exit)" value={result.enterpriseValueExit !== null ? `$${result.enterpriseValueExit}B` : "N/A"} />
                                <RI label="Equity Value" value={`$${result.equityValueGordon}B`} cls="positive" />
                                <RI label="Share Price" value={`$${result.impliedSharePriceGordon}`} cls="accent" />
                                <RI label="PV of FCFs" value={`$${result.sumPVFCFs}B`} />
                                <RI label="PV Terminal" value={`$${result.pvTerminalGordon}B`} />
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Year</th><th>FCF ($B)</th><th>PV ($B)</th></tr></thead>
                                <tbody>{result.projectedFCFs.map(f => (
                                    <tr key={f.year}><td>{f.year}</td><td>{f.fcf}</td><td>{f.pvFCF}</td></tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="glass-card">
                    <h3 className="card-title"><span className="icon">⚖️</span> WACC Calculator</h3>
                    <p className="card-subtitle">Auto-populated from {selectedCompany.ticker} (β={selectedCompany.beta})</p>
                    <button className="btn-primary" onClick={calcWACC}>Calculate WACC</button>
                    {waccResult && (
                        <div className="result-panel">
                            <div className="result-grid">
                                <RI label="WACC" value={fmtPct(waccResult.wacc)} cls="accent" />
                                <RI label="Cost of Equity" value={fmtPct(waccResult.costOfEquity)} />
                                <RI label="After-Tax Debt" value={fmtPct(waccResult.afterTaxCostOfDebt)} />
                                <RI label="Equity Weight" value={fmtPct(waccResult.weightEquity)} />
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Options Pricing
    // ═══════════════════════════════════════════════════════════
    const OptionsTab = () => {
        const [spot, setSpot] = useState(String(selectedCompany.currentPrice));
        const [strike, setStrike] = useState(String(Math.round(selectedCompany.currentPrice * 1.05)));
        const [expiry, setExpiry] = useState("0.25");
        const [rf, setRf] = useState("0.05");
        const [vol, setVol] = useState(String(selectedCompany.annualVolatility.toFixed(2)));
        const [optType, setOptType] = useState<"call" | "put">("call");
        const [result, setResult] = useState<OptionsResult | null>(null);

        const populate = (c: CompanyData) => { setSpot(String(c.currentPrice)); setStrike(String(Math.round(c.currentPrice * 1.05))); setVol(String(c.annualVolatility.toFixed(2))); };

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                setResult(calculateBlackScholes({ spotPrice: parseFloat(spot), strikePrice: parseFloat(strike), timeToExpiry: parseFloat(expiry), riskFreeRate: parseFloat(rf), volatility: parseFloat(vol), optionType: optType }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        return (
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">⚡</span> Black-Scholes Options</h3>
                <p className="card-subtitle">European option pricing with full Greeks</p>
                <CompanySelector onChange={populate} />
                <div className="form-row">
                    <FG label="Spot Price (S)" value={spot} onChange={setSpot} type="number" />
                    <FG label="Strike Price (K)" value={strike} onChange={setStrike} type="number" />
                </div>
                <div className="form-row-3">
                    <FG label="Time (years)" value={expiry} onChange={setExpiry} type="number" />
                    <FG label="Risk-Free Rate" value={rf} onChange={setRf} type="number" />
                    <FG label="Volatility (σ)" value={vol} onChange={setVol} type="number" />
                </div>
                <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={optType} onChange={e => setOptType(e.target.value as "call" | "put")}>
                        <option value="call">Call</option><option value="put">Put</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Price Option"}</button>
                {result && (
                    <div className="result-panel">
                        <div className="result-title">📊 {optType.toUpperCase()} Option — Premium: {fmtMoney(result.price)}</div>
                        <div className="result-grid">
                            <RI label="Option Price" value={fmtMoney(result.price)} cls="accent" />
                            <RI label="Intrinsic Value" value={fmtMoney(result.intrinsicValue)} />
                            <RI label="Time Value" value={fmtMoney(result.timeValue)} />
                            <RI label="Put-Call Parity" value={`C=${fmt(result.putCallParity.callPrice)} P=${fmt(result.putCallParity.putPrice)}`} />
                        </div>
                        <div className="greeks-grid">
                            <div className="greek-item"><div className="greek-symbol">Δ</div><div className="greek-name">Delta</div><div className="greek-value">{result.delta}</div></div>
                            <div className="greek-item"><div className="greek-symbol">Γ</div><div className="greek-name">Gamma</div><div className="greek-value">{result.gamma}</div></div>
                            <div className="greek-item"><div className="greek-symbol">Θ</div><div className="greek-name">Theta</div><div className="greek-value">{result.theta}</div></div>
                            <div className="greek-item"><div className="greek-symbol">ν</div><div className="greek-name">Vega</div><div className="greek-value">{result.vega}</div></div>
                            <div className="greek-item"><div className="greek-symbol">ρ</div><div className="greek-name">Rho</div><div className="greek-value">{result.rho}</div></div>
                            <div className="greek-item"><div className="greek-symbol">d₁</div><div className="greek-name">d1</div><div className="greek-value">{result.d1}</div></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Bonds
    // ═══════════════════════════════════════════════════════════
    const BondsTab = () => {
        const [face, setFace] = useState("1000");
        const [coupon, setCoupon] = useState("0.06");
        const [years, setYears] = useState("10");
        const [mktRate, setMktRate] = useState("0.05");
        const [freq, setFreq] = useState("2");
        const [result, setResult] = useState<BondResult | null>(null);

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                setResult(calculateBond({ faceValue: parseFloat(face), couponRate: parseFloat(coupon), yearsToMaturity: parseInt(years), marketRate: parseFloat(mktRate), paymentFrequency: parseInt(freq) }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        return (
            <div className="glass-card">
                <h3 className="card-title"><span className="icon">📜</span> Bond Valuation</h3>
                <p className="card-subtitle">Price, YTM, Duration, Convexity</p>
                <div className="form-row-3">
                    <FG label="Face Value" value={face} onChange={setFace} type="number" />
                    <FG label="Coupon Rate" value={coupon} onChange={setCoupon} type="number" />
                    <FG label="Years" value={years} onChange={setYears} type="number" />
                </div>
                <div className="form-row">
                    <FG label="Market Rate" value={mktRate} onChange={setMktRate} type="number" />
                    <div className="form-group">
                        <label className="form-label">Frequency</label>
                        <select className="form-select" value={freq} onChange={e => setFreq(e.target.value)}>
                            <option value="1">Annual</option><option value="2">Semi-Annual</option><option value="4">Quarterly</option>
                        </select>
                    </div>
                </div>
                <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : "Calculate Bond"}</button>
                {result && (
                    <div className="result-panel">
                        <div className="result-title">📊 Bond Analysis <span className={`tag ${result.premiumDiscount === "Premium" ? "tag-premium" : result.premiumDiscount === "Discount" ? "tag-discount" : "tag-par"}`}>{result.premiumDiscount}</span></div>
                        <div className="result-grid">
                            <RI label="Bond Price" value={fmtMoney(result.bondPrice)} cls="accent" />
                            <RI label="YTM" value={fmtPct(result.ytm)} />
                            <RI label="Current Yield" value={fmtPct(result.currentYield)} />
                            <RI label="Macaulay Duration" value={`${result.macaulayDuration} yrs`} />
                            <RI label="Modified Duration" value={fmt(result.modifiedDuration, 4)} />
                            <RI label="Convexity" value={fmt(result.convexity, 4)} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: Portfolio Optimization
    // ═══════════════════════════════════════════════════════════
    const PortfolioTab = () => {
        const [assets, setAssets] = useState(["AAPL", "MSFT", "JPM"]);
        const [rf, setRf] = useState("0.04");
        const [result, setResult] = useState<PortfolioResult | null>(null);
        const [ratiosResult, setRatiosResult] = useState<RatiosResult | null>(null);

        const calc = () => {
            clearError();
            try {
                setLoading(true);
                const selected = assets.map(t => COMPANIES.find(c => c.ticker === t)!).filter(Boolean);
                if (selected.length < 2) throw new Error("Select at least 2 assets");

                const portAssets = selected.map(c => ({ name: c.ticker, expectedReturn: c.annualReturn, volatility: c.annualVolatility }));

                // Build correlation matrix (simplified: use 0.3 for cross, 1 for diagonal)
                const n = selected.length;
                const corr = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0.3));

                setResult(optimizePortfolio({ assets: portAssets, correlationMatrix: corr, riskFreeRate: parseFloat(rf) }));
            } catch (e) { handleError(e); } finally { setLoading(false); }
        };

        const calcRatios = () => {
            try {
                const c = selectedCompany;
                setRatiosResult(calculateRatios({
                    currentAssets: c.currentAssets, inventory: c.inventory, cashAndEquivalents: c.cashAndEquivalents,
                    totalAssets: c.totalAssets, currentLiabilities: c.currentLiabilities, totalLiabilities: c.totalLiabilities,
                    totalEquity: c.totalEquity, longTermDebt: c.longTermDebt, revenue: c.revenue, costOfGoodsSold: c.costOfGoodsSold,
                    operatingIncome: c.operatingIncome, netIncome: c.netIncome, interestExpense: c.interestExpense,
                    ebitda: c.ebitda, taxExpense: c.taxExpense, totalReceivables: c.totalReceivables, totalPayables: c.totalPayables,
                    dividendsPaid: c.dividendsPaid, sharesOutstanding: c.sharesOutstanding, marketPrice: c.currentPrice,
                }));
            } catch (e) { handleError(e); }
        };

        return (
            <>
                <div className="glass-card">
                    <h3 className="card-title"><span className="icon">🎯</span> Portfolio Optimization</h3>
                    <p className="card-subtitle">Markowitz mean-variance optimization</p>
                    <div className="form-group">
                        <label className="form-label">Select Assets (Ctrl+Click)</label>
                        <select className="form-select" multiple size={6} value={assets} onChange={e => setAssets(Array.from(e.target.selectedOptions, o => o.value))}>
                            {COMPANIES.map(c => <option key={c.ticker} value={c.ticker}>{c.ticker} ({(c.annualReturn * 100).toFixed(0)}% ret, {(c.annualVolatility * 100).toFixed(0)}% vol)</option>)}
                        </select>
                    </div>
                    <FG label="Risk-Free Rate" value={rf} onChange={setRf} type="number" />
                    <button className="btn-primary" onClick={calc} disabled={loading}>{loading ? <span className="loading-spinner" /> : `Optimize ${assets.length} Assets`}</button>
                    {result && (
                        <div className="result-panel">
                            <div className="result-title">📊 Optimal Portfolios</div>
                            <div style={{ marginBottom: 8 }}>
                                <strong style={{ fontSize: 11, color: "var(--accent-primary)" }}>Max Sharpe (SR: {result.maxSharpePortfolio.sharpeRatio})</strong>
                                <div className="result-grid" style={{ marginTop: 4 }}>
                                    <RI label="Return" value={fmtPct(result.maxSharpePortfolio.expectedReturn)} cls="positive" />
                                    <RI label="Risk" value={fmtPct(result.maxSharpePortfolio.volatility)} />
                                </div>
                                <div style={{ marginTop: 4 }}>
                                    {result.maxSharpePortfolio.weights.map(w => (
                                        <span key={w.asset} className="company-chip">{w.asset}: {(w.weight * 100).toFixed(1)}%</span>
                                    ))}
                                </div>
                            </div>
                            <div className="section-divider" />
                            <div>
                                <strong style={{ fontSize: 11, color: "var(--success)" }}>Min Variance (Vol: {fmtPct(result.minVariancePortfolio.volatility)})</strong>
                                <div style={{ marginTop: 4 }}>
                                    {result.minVariancePortfolio.weights.map(w => (
                                        <span key={w.asset} className="company-chip">{w.asset}: {(w.weight * 100).toFixed(1)}%</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="glass-card">
                    <h3 className="card-title"><span className="icon">📋</span> Financial Ratios</h3>
                    <p className="card-subtitle">Comprehensive ratio analysis for {selectedCompany.ticker}</p>
                    <CompanySelector />
                    <button className="btn-primary" onClick={calcRatios}>Analyze Ratios</button>
                    {ratiosResult && (
                        <div className="result-panel">
                            <div className="result-title">Liquidity</div>
                            <div className="result-grid">
                                <RI label="Current Ratio" value={fmt(ratiosResult.liquidity.currentRatio)} cls={ratiosResult.liquidity.currentRatio >= 1 ? "positive" : "negative"} />
                                <RI label="Quick Ratio" value={fmt(ratiosResult.liquidity.quickRatio)} />
                            </div>
                            <div className="section-divider" />
                            <div className="result-title">Profitability</div>
                            <div className="result-grid">
                                <RI label="ROE" value={fmtPct(ratiosResult.profitability.roe)} cls="accent" />
                                <RI label="ROA" value={fmtPct(ratiosResult.profitability.roa)} />
                                <RI label="Net Margin" value={fmtPct(ratiosResult.profitability.netMargin)} cls="positive" />
                                <RI label="Gross Margin" value={fmtPct(ratiosResult.profitability.grossMargin)} />
                            </div>
                            <div className="section-divider" />
                            <div className="result-title">Leverage</div>
                            <div className="result-grid">
                                <RI label="D/E Ratio" value={fmt(ratiosResult.leverage.debtToEquity)} cls={ratiosResult.leverage.debtToEquity > 2 ? "negative" : "positive"} />
                                <RI label="Interest Coverage" value={fmt(ratiosResult.leverage.interestCoverage)} />
                            </div>
                            <div className="section-divider" />
                            <div className="result-title">DuPont Analysis</div>
                            <div className="result-grid">
                                <RI label="ROE (DuPont)" value={fmtPct(ratiosResult.dupont.roe)} cls="accent" />
                                <RI label="Asset Turnover" value={fmt(ratiosResult.dupont.assetTurnover, 4)} />
                                <RI label="Equity Multiplier" value={fmt(ratiosResult.dupont.equityMultiplier, 4)} />
                                <RI label="Tax Burden" value={fmtPct(ratiosResult.dupont.taxBurden)} />
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // Shared UI Components
    // ═══════════════════════════════════════════════════════════

    const renderTab = () => {
        switch (tab) {
            case "dashboard": return <DashboardTab />;
            case "var": return <VaRTab />;
            case "credit": return <CreditTab />;
            case "mc": return <MonteCarloTab />;
            case "sens": return <SensitivityTab />;
            case "capbudget": return <CapBudgetTab />;
            case "dcf": return <DCFTab />;
            case "options": return <OptionsTab />;
            case "bonds": return <BondsTab />;
            case "portfolio": return <PortfolioTab />;
        }
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <span className="app-title">⚡ Risk Modeling Platform</span>
                <span className={`connection-badge ${connStatus === "online" ? "online" : "offline"}`}>
                    <span className="badge-dot" />
                    {connStatus === "online" ? "Online" : connStatus === "checking" ? "Checking..." : "Offline"}
                </span>
            </div>
            <div className="tab-nav">
                {TABS.map(t => (
                    <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => { setTab(t.id); setError(""); }}>
                        <span className="tab-icon">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>
            <div className="content-area">
                {renderTab()}
                {error && <div className="error-message">⚠️ {error}</div>}
            </div>
        </div>
    );
};

// ── Reusable: Form Group ──
const FG = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        <input className="form-input" type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
);

// ── Reusable: Result Item ──
const RI = ({ label, value, cls }: { label: string; value: string; cls?: string }) => (
    <div className="result-item">
        <span className="result-label">{label}</span>
        <span className={`result-value ${cls || ""}`}>{value}</span>
    </div>
);

export default App;
