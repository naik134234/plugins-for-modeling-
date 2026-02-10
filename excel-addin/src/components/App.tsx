import React, { useState } from "react";
import {
    Button,
    Tab,
    TabList,
    Title3,
    Card,
    CardHeader,
    Text,
    makeStyles,
    shorthands,
    Spinner,
    Dropdown,
    Option,
    Input,
    Label,
    type InputOnChangeData,
    type SelectionEvents,
    type OptionOnSelectData,
    Divider,
} from "@fluentui/react-components";
import {
    ArrowTrendingLines24Regular,
    AppsListDetail24Regular,
    Settings24Regular,
    Money24Regular,
    DataUsage24Regular
} from "@fluentui/react-icons";
import { ExcelService } from "../utils/excel";
import { ApiService, VaRRequest, MertonRequest, SensitivityRequest } from "../services/api";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        ...shorthands.padding("10px"),
        ...shorthands.gap("10px"),
        height: "100vh",
    },
    header: {
        marginBottom: "10px",
    },
    content: {
        flexGrow: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        ...shorthands.gap("10px"),
    },
    card: {
        ...shorthands.margin("5px"),
        maxWidth: "100%",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        ...shorthands.gap("5px"),
        marginBottom: "10px",
    },
    resultArea: {
        marginTop: "10px",
        padding: "10px",
        backgroundColor: "#f0f0f0",
        borderRadius: "4px",
    }
});

const App: React.FC = () => {
    const styles = useStyles();
    const [selectedTab, setSelectedTab] = useState<string>("risk");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string>("");

    // VaR State
    const [portfolioValue, setPortfolioValue] = useState("1000000");
    const [confidence, setConfidence] = useState("0.95");
    const [horizon, setHorizon] = useState("1");
    const [method, setMethod] = useState("historical");

    // Credit Risk State
    const [assetValue, setAssetValue] = useState("100");
    const [debtValue, setDebtValue] = useState("80");
    const [riskFreeRate, setRiskFreeRate] = useState("0.05");
    const [volatility, setVolatility] = useState("0.2");
    const [maturity, setMaturity] = useState("1");

    // Sensitivity State
    const [targetParam, setTargetParam] = useState("asset_value");
    const [minVal, setMinVal] = useState("80");
    const [maxVal, setMaxVal] = useState("120");
    const [steps, setSteps] = useState("10");


    const handleCalculateVaR = async () => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const excelData = await ExcelService.getSelectedRangeData();
            const returns = excelData.values.flat().filter(v => typeof v === 'number') as number[];

            if (returns.length < 10 && method === "historical") {
                throw new Error("Please select at least 10 return values.");
            }

            const payload: VaRRequest = {
                portfolio_value: parseFloat(portfolioValue),
                confidence_level: parseFloat(confidence),
                time_horizon: parseInt(horizon),
                method: method as "historical" | "parametric" | "monte_carlo",
                returns: returns.length > 0 ? returns : [0] // Handle case where no selection needed for some methods
            };

            const response = await ApiService.calculateVaR(payload);
            setResult(response);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Calculation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateCredit = async () => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const payload: MertonRequest = {
                asset_value: parseFloat(assetValue),
                debt_face_value: parseFloat(debtValue),
                risk_free_rate: parseFloat(riskFreeRate),
                volatility: parseFloat(volatility),
                time_to_maturity: parseFloat(maturity)
            };

            const response = await ApiService.calculateMerton(payload);
            setResult(response);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Calculation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateSensitivity = async () => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const baseInputs = {
                asset_value: parseFloat(assetValue),
                debt_face_value: parseFloat(debtValue),
                risk_free_rate: parseFloat(riskFreeRate),
                volatility: parseFloat(volatility),
                time_to_maturity: parseFloat(maturity)
            };

            const payload: SensitivityRequest = {
                base_inputs: baseInputs,
                target_parameter: targetParam,
                min_value: parseFloat(minVal),
                max_value: parseFloat(maxVal),
                steps: parseInt(steps)
            };

            const response = await ApiService.calculateSensitivity(payload);
            setResult(response);

            // Output to Excel
            if (response && response.values && response.pd_outputs) {
                const data = [
                    ["Parameter Value", "Probability of Default", "% Change"],
                    ...response.values.map((v: number, i: number) => [
                        v,
                        response.pd_outputs[i],
                        response.pd_pct_change[i]
                    ])
                ];
                await ExcelService.writeDataToSelection(data);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Calculation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Title3>Risk Platform</Title3>
            </div>

            <TabList
                selectedValue={selectedTab}
                onTabSelect={(_, data) => {
                    setSelectedTab(data.value as string);
                    setResult(null);
                    setError("");
                }}
            >
                <Tab id="risk" value="risk" icon={<ArrowTrendingLines24Regular />}>VaR</Tab>
                <Tab id="credit" value="credit" icon={<Money24Regular />}>Credit</Tab>
                <Tab id="sens" value="sens" icon={<DataUsage24Regular />}>Sens</Tab>
                <Tab id="sim" value="sim" icon={<AppsListDetail24Regular />}>Sim</Tab>
            </TabList>

            <div className={styles.content}>
                {selectedTab === "risk" && (
                    <Card className={styles.card}>
                        <CardHeader header={<Text weight="semibold">Value at Risk (VaR)</Text>} />
                        <div className={styles.inputGroup}>
                            <Label>Portfolio Value</Label>
                            <Input value={portfolioValue} onChange={(_e, d) => setPortfolioValue(d.value)} type="number" />
                        </div>
                        <div className={styles.inputGroup}>
                            <Label>Method</Label>
                            <Dropdown value={method} selectedOptions={[method]} onOptionSelect={(_e, d) => setMethod(d.optionValue as string)}>
                                <Option value="historical">Historical</Option>
                                <Option value="parametric">Parametric</Option>
                                <Option value="monte_carlo">Monte Carlo</Option>
                            </Dropdown>
                        </div>
                        <p style={{ fontSize: '11px', color: '#666' }}>Select returns range in Excel.</p>
                        <Button appearance="primary" onClick={handleCalculateVaR} disabled={loading}>{loading ? <Spinner size="tiny" /> : "Calculate VaR"}</Button>
                        {result && (
                            <div className={styles.resultArea}>
                                <Text weight="semibold">VaR: ${result.var_absolute.toLocaleString()}</Text>
                                <div>ES: ${result.expected_shortfall.toLocaleString()}</div>
                            </div>
                        )}
                    </Card>
                )}

                {selectedTab === "credit" && (
                    <Card className={styles.card}>
                        <CardHeader header={<Text weight="semibold">Merton Credit Model</Text>} />
                        <div className={styles.inputGroup}><Label>Asset Value (V)</Label><Input value={assetValue} onChange={(_e, d) => setAssetValue(d.value)} type="number" /></div>
                        <div className={styles.inputGroup}><Label>Debt Face Value (D)</Label><Input value={debtValue} onChange={(_e, d) => setDebtValue(d.value)} type="number" /></div>
                        <div className={styles.inputGroup}><Label>Volatility (σ)</Label><Input value={volatility} onChange={(_e, d) => setVolatility(d.value)} type="number" /></div>
                        <div className={styles.inputGroup}><Label>Risk-Free Rate (r)</Label><Input value={riskFreeRate} onChange={(_e, d) => setRiskFreeRate(d.value)} type="number" /></div>
                        <div className={styles.inputGroup}><Label>Time to Maturity (T)</Label><Input value={maturity} onChange={(_e, d) => setMaturity(d.value)} type="number" /></div>
                        <Button appearance="primary" onClick={handleCalculateCredit} disabled={loading}>{loading ? <Spinner size="tiny" /> : "Calculate Credit Risk"}</Button>
                        {result && (
                            <div className={styles.resultArea}>
                                <div>PD: {(result.probability_of_default * 100).toFixed(4)}%</div>
                                <div>DD: {result.distance_to_default}</div>
                                <div>Equity: ${result.equity_value}</div>
                                <div>Debt: ${result.debt_value}</div>
                            </div>
                        )}
                    </Card>
                )}

                {selectedTab === "sens" && (
                    <Card className={styles.card}>
                        <CardHeader header={<Text weight="semibold">Sensitivity Analysis</Text>} />
                        <p style={{ fontSize: '11px' }}>Varies inputs for Merton Model.</p>
                        <div className={styles.inputGroup}>
                            <Label>Target Parameter</Label>
                            <Dropdown value={targetParam} selectedOptions={[targetParam]} onOptionSelect={(_e, d) => setTargetParam(d.optionValue as string)}>
                                <Option value="asset_value">Asset Value</Option>
                                <Option value="volatility">Volatility</Option>
                            </Dropdown>
                        </div>
                        <div className={styles.inputGroup}><Label>Min Value</Label><Input value={minVal} onChange={(_e, d) => setMinVal(d.value)} type="number" /></div>
                        <div className={styles.inputGroup}><Label>Max Value</Label><Input value={maxVal} onChange={(_e, d) => setMaxVal(d.value)} type="number" /></div>
                        <Button appearance="primary" onClick={handleCalculateSensitivity} disabled={loading}>{loading ? <Spinner size="tiny" /> : "Run Sensitivity"}</Button>
                        {result && (
                            <div className={styles.resultArea}>
                                <Text weight="semibold">Analysis Complete</Text>
                                <p style={{ fontSize: '11px' }}>Results written to Excel selection.</p>
                            </div>
                        )}
                    </Card>
                )}

                {selectedTab === "sim" && (
                    <Card className={styles.card}>
                        <CardHeader header={<Text weight="semibold">Monte Carlo</Text>} />
                        <p>Generic simulation interface coming soon.</p>
                    </Card>
                )}

                {error && <Text style={{ color: 'red', marginTop: '10px' }}>{error}</Text>}
            </div>
        </div>
    );
};

export default App;
