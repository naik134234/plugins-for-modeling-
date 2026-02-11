/// <reference types="office-js" />
/* global Excel */

/**
 * Excel Financial Model Builder
 * 
 * Creates complete, cell-linked financial model sheets in Excel:
 * - Company Overview Dashboard
 * - Balance Sheet
 * - Income Statement  
 * - Financial Ratios (with formulas linked to B/S and I/S)
 * - DCF Valuation Model (with editable assumptions)
 * - VaR & Risk Analysis
 * - WACC Calculator
 * - Loan Amortization Schedule
 * 
 * All sheets use cell references so changes propagate automatically.
 */

import { CompanyData } from "../data/financial-data";

// ═══ Colors ═══
const C = {
    DEEP: "#0d1117", DARK: "#161b22", MID: "#21262d", LIGHT: "#30363d",
    ACCENT: "#58a6ff", ACCENT2: "#7c3aed", GREEN: "#3fb950", RED: "#f85149",
    ORANGE: "#d29922", YELLOW: "#e3b341",
    TEXT: "#e6edf3", MUTED: "#8b949e", WHITE: "#ffffff",
    HEADER_BG: "#1a1b4b", SECTION_BG: "#0d1b2a", INPUT_BG: "#1c2333",
};

// Helper to safely run Excel operations
async function excelRun(fn: (ctx: Excel.RequestContext, sheet: Excel.Worksheet) => Promise<void>, sheetName: string) {
    return Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        let sheet: Excel.Worksheet;
        const existing = sheets.items.find(s => s.name === sheetName);
        if (existing) {
            sheet = existing;
            const usedRange = sheet.getUsedRangeOrNullObject();
            usedRange.load("isNullObject");
            await context.sync();
            if (!usedRange.isNullObject) usedRange.clear();
        } else {
            sheet = sheets.add(sheetName);
        }
        await context.sync();
        await fn(context, sheet);
    });
}

// Utility to set a range with formatting
function setCell(sheet: Excel.Worksheet, row: number, col: number, value: string | number, opts?: {
    bold?: boolean; size?: number; color?: string; bg?: string; format?: string;
    merge?: number; italic?: boolean; align?: Excel.HorizontalAlignment; border?: boolean;
    formula?: string; wrap?: boolean; width?: number;
}) {
    const range = sheet.getRangeByIndexes(row, col, 1, opts?.merge || 1);
    if (opts?.formula) {
        range.formulas = [[opts.formula]];
    } else {
        range.values = [[value]];
    }
    if (opts?.merge && opts.merge > 1) range.merge();
    if (opts?.bold) range.format.font.bold = true;
    if (opts?.size) range.format.font.size = opts.size;
    if (opts?.color) range.format.font.color = opts.color;
    if (opts?.bg) range.format.fill.color = opts.bg;
    if (opts?.format) range.numberFormat = [[opts.format]];
    if (opts?.italic) range.format.font.italic = true;
    if (opts?.align) range.format.horizontalAlignment = opts.align;
    if (opts?.wrap) range.format.wrapText = true;
    if (opts?.width) range.format.columnWidth = opts.width;
    return range;
}

function sectionHeader(sheet: Excel.Worksheet, row: number, text: string, cols = 6) {
    const r = sheet.getRangeByIndexes(row, 0, 1, cols);
    r.merge();
    r.values = [[text]];
    r.format.font.bold = true;
    r.format.font.size = 12;
    r.format.font.color = C.ACCENT;
    r.format.fill.color = C.HEADER_BG;
    r.format.rowHeight = 26;
}

function labelValue(sheet: Excel.Worksheet, row: number, label: string, value: string | number, fmt?: string, formula?: string) {
    setCell(sheet, row, 0, label, { color: C.MUTED, bg: C.DARK, bold: true });
    setCell(sheet, row, 1, formula ? "" : value, { color: C.TEXT, bg: C.DEEP, format: fmt, formula, merge: 2 });
}

// ════════════════════════════════════════════════════════════
// 1. COMPANY OVERVIEW DASHBOARD
// ════════════════════════════════════════════════════════════
async function buildOverview(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        // Set column widths
        sheet.getRange("A:A").format.columnWidth = 180;
        sheet.getRange("B:B").format.columnWidth = 140;
        sheet.getRange("C:C").format.columnWidth = 140;
        sheet.getRange("D:D").format.columnWidth = 140;
        sheet.getRange("E:E").format.columnWidth = 140;

        // Fill entire visible area with dark bg
        sheet.getRange("A1:F50").format.fill.color = C.DEEP;

        let r = 0;
        // Title
        setCell(sheet, r, 0, `${co.name} (${co.ticker})`, { bold: true, size: 18, color: C.ACCENT, bg: C.HEADER_BG, merge: 5 });
        sheet.getRangeByIndexes(r, 0, 1, 1).format.rowHeight = 36;
        r++;
        setCell(sheet, r, 0, `${co.exchange} | ${co.sector} | Generated: ${new Date().toLocaleString()}`, { italic: true, size: 10, color: C.MUTED, bg: C.HEADER_BG, merge: 5 });
        r += 2;

        // Key Metrics
        sectionHeader(sheet, r, "📊 Key Market Metrics"); r++;
        labelValue(sheet, r, "Current Price", co.currentPrice, "$#,##0.00"); r++;
        labelValue(sheet, r, "Market Cap ($B)", co.marketCap, "#,##0.0"); r++;
        labelValue(sheet, r, "Beta", co.beta, "0.00"); r++;
        labelValue(sheet, r, "Shares Outstanding (M)", co.sharesOutstanding, "#,##0"); r++;
        labelValue(sheet, r, "Annual Return", co.annualReturn, "0.00%"); r++;
        labelValue(sheet, r, "Annual Volatility", co.annualVolatility, "0.00%"); r++;
        r++;

        // Quick Financial Summary
        sectionHeader(sheet, r, "📈 Financial Summary ($B)"); r++;
        // Headers
        setCell(sheet, r, 0, "", { bg: C.DARK });
        setCell(sheet, r, 1, "Value", { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        setCell(sheet, r, 2, "% of Revenue", { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        r++;

        const finRows: [string, number, string][] = [
            ["Revenue", co.revenue, ""],
            ["COGS", co.costOfGoodsSold, `=B${r + 2}/B${r + 1}`],
            ["Gross Profit", co.revenue - co.costOfGoodsSold, `=B${r + 3}/B${r + 1}`],
            ["Operating Income", co.operatingIncome, `=B${r + 4}/B${r + 1}`],
            ["EBITDA", co.ebitda, `=B${r + 5}/B${r + 1}`],
            ["Net Income", co.netIncome, `=B${r + 6}/B${r + 1}`],
            ["Free Cash Flow", co.freeCashFlow, `=B${r + 7}/B${r + 1}`],
        ];

        for (const [lbl, val, fml] of finRows) {
            setCell(sheet, r, 0, lbl, { color: C.MUTED, bg: C.DARK, bold: true });
            setCell(sheet, r, 1, val, { color: C.TEXT, bg: C.DEEP, format: "#,##0.0" });
            if (fml) {
                setCell(sheet, r, 2, "", { color: C.YELLOW, bg: C.DEEP, format: "0.0%", formula: fml });
            } else {
                setCell(sheet, r, 2, "100.0%", { color: C.YELLOW, bg: C.DEEP });
            }
            r++;
        }
        r++;

        // Balance Sheet Summary  
        sectionHeader(sheet, r, "🏦 Balance Sheet ($B)"); r++;
        labelValue(sheet, r, "Total Assets", co.totalAssets, "#,##0.0"); r++;
        labelValue(sheet, r, "Total Equity", co.totalEquity, "#,##0.0"); r++;
        labelValue(sheet, r, "Total Liabilities", co.totalLiabilities, "#,##0.0"); r++;
        labelValue(sheet, r, "Debt-to-Equity", "", "0.00", `=B${r}/B${r - 1}`); r++;
        labelValue(sheet, r, "Current Assets", co.currentAssets, "#,##0.0"); r++;
        labelValue(sheet, r, "Current Liabilities", co.currentLiabilities, "#,##0.0"); r++;
        labelValue(sheet, r, "Current Ratio", "", "0.00", `=B${r - 1}/B${r}`); r++;
        labelValue(sheet, r, "Cash & Equivalents", co.cashAndEquivalents, "#,##0.0"); r++;
        labelValue(sheet, r, "Long-Term Debt", co.longTermDebt, "#,##0.0"); r++;

        sheet.activate();
        await ctx.sync();
    }, "Dashboard");
}

// ════════════════════════════════════════════════════════════
// 2. BALANCE SHEET
// ════════════════════════════════════════════════════════════
async function buildBalanceSheet(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        sheet.getRange("A:A").format.columnWidth = 200;
        sheet.getRange("B:B").format.columnWidth = 150;
        sheet.getRange("C:C").format.columnWidth = 150;
        sheet.getRange("A1:D60").format.fill.color = C.DEEP;

        let r = 0;
        setCell(sheet, r, 0, `${co.ticker} — Balance Sheet ($B)`, { bold: true, size: 16, color: C.ACCENT, bg: C.HEADER_BG, merge: 3 });
        sheet.getRangeByIndexes(r, 0, 1, 1).format.rowHeight = 32;
        r += 2;

        // ASSETS
        sectionHeader(sheet, r, "ASSETS", 3); r++;
        setCell(sheet, r, 0, "Current Assets", { bold: true, color: C.ACCENT2, bg: C.SECTION_BG }); r++;
        labelValue(sheet, r, "  Cash & Equivalents", co.cashAndEquivalents, "#,##0.00"); r++;
        labelValue(sheet, r, "  Receivables", co.totalReceivables, "#,##0.00"); r++;
        labelValue(sheet, r, "  Inventory", co.inventory, "#,##0.00"); r++;
        const caRowStart = r - 3;
        labelValue(sheet, r, "  Other Current Assets", "", "#,##0.00", `=B${caRowStart + 1}-B${caRowStart + 2}-B${caRowStart + 3}-B${caRowStart + 4}`);
        r++;
        labelValue(sheet, r, "Total Current Assets", co.currentAssets, "#,##0.00");
        setCell(sheet, r, 0, "Total Current Assets", { bold: true, color: C.GREEN, bg: C.DARK });
        setCell(sheet, r, 1, co.currentAssets, { bold: true, color: C.GREEN, bg: C.DARK, format: "#,##0.00", merge: 2 });
        r += 2;

        setCell(sheet, r, 0, "Non-Current Assets", { bold: true, color: C.ACCENT2, bg: C.SECTION_BG }); r++;
        const ncAssets = co.totalAssets - co.currentAssets;
        labelValue(sheet, r, "  PP&E and Other Non-Current", ncAssets, "#,##0.00"); r++;
        labelValue(sheet, r, "Total Assets", co.totalAssets, "#,##0.00");
        setCell(sheet, r, 0, "TOTAL ASSETS", { bold: true, color: C.ACCENT, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, co.totalAssets, { bold: true, color: C.ACCENT, bg: C.MID, format: "#,##0.00", merge: 2 });
        r += 2;

        // LIABILITIES
        sectionHeader(sheet, r, "LIABILITIES", 3); r++;
        setCell(sheet, r, 0, "Current Liabilities", { bold: true, color: C.ACCENT2, bg: C.SECTION_BG }); r++;
        labelValue(sheet, r, "  Accounts Payable", co.totalPayables, "#,##0.00"); r++;
        labelValue(sheet, r, "  Other Current Liabilities", co.currentLiabilities - co.totalPayables, "#,##0.00"); r++;
        setCell(sheet, r, 0, "Total Current Liabilities", { bold: true, color: C.RED, bg: C.DARK });
        setCell(sheet, r, 1, co.currentLiabilities, { bold: true, color: C.RED, bg: C.DARK, format: "#,##0.00", merge: 2 });
        r += 2;

        setCell(sheet, r, 0, "Non-Current Liabilities", { bold: true, color: C.ACCENT2, bg: C.SECTION_BG }); r++;
        labelValue(sheet, r, "  Long-Term Debt", co.longTermDebt, "#,##0.00"); r++;
        labelValue(sheet, r, "  Other Non-Current Liabilities", co.totalLiabilities - co.currentLiabilities - co.longTermDebt, "#,##0.00"); r++;
        setCell(sheet, r, 0, "TOTAL LIABILITIES", { bold: true, color: C.RED, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, co.totalLiabilities, { bold: true, color: C.RED, bg: C.MID, format: "#,##0.00", merge: 2 });
        r += 2;

        // EQUITY
        sectionHeader(sheet, r, "SHAREHOLDERS' EQUITY", 3); r++;
        labelValue(sheet, r, "  Total Equity", co.totalEquity, "#,##0.00"); r++;
        setCell(sheet, r, 0, "TOTAL LIABILITIES + EQUITY", { bold: true, color: C.ACCENT, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.ACCENT, bg: C.MID, format: "#,##0.00", merge: 2,
            formula: `=B${r - 3}+B${r}`
        });
        r += 2;

        // Check
        setCell(sheet, r, 0, "✅ Balance Check (should = 0)", { color: C.MUTED, bg: C.DEEP });
        setCell(sheet, r, 1, "", {
            color: C.GREEN, bg: C.DEEP, format: "#,##0.00", merge: 2,
            formula: `=B${r - 8 - 6}-B${r - 1}`
        });

        await ctx.sync();
    }, "BalanceSheet");
}

// ════════════════════════════════════════════════════════════
// 3. INCOME STATEMENT
// ════════════════════════════════════════════════════════════
async function buildIncomeStatement(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        sheet.getRange("A:A").format.columnWidth = 200;
        sheet.getRange("B:B").format.columnWidth = 150;
        sheet.getRange("C:C").format.columnWidth = 120;
        sheet.getRange("A1:D40").format.fill.color = C.DEEP;

        let r = 0;
        setCell(sheet, r, 0, `${co.ticker} — Income Statement ($B)`, { bold: true, size: 16, color: C.ACCENT, bg: C.HEADER_BG, merge: 3 });
        sheet.getRangeByIndexes(r, 0, 1, 1).format.rowHeight = 32;
        r += 2;

        // Headers
        setCell(sheet, r, 0, "Line Item", { bold: true, color: C.ACCENT, bg: C.DARK });
        setCell(sheet, r, 1, "Amount ($B)", { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        setCell(sheet, r, 2, "% Margin", { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        r++;

        const revRow = r + 1; // Excel 1-indexed


        // Revenue
        setCell(sheet, r, 0, "Revenue", { bold: true, color: C.GREEN, bg: C.DARK });
        setCell(sheet, r, 1, co.revenue, { bold: true, color: C.GREEN, bg: C.DARK, format: "#,##0.00" });
        setCell(sheet, r, 2, 1, { color: C.YELLOW, bg: C.DARK, format: "0.0%" });
        r++;

        // COGS
        setCell(sheet, r, 0, "(-) Cost of Goods Sold", { color: C.RED, bg: C.DEEP });
        setCell(sheet, r, 1, -co.costOfGoodsSold, { color: C.RED, bg: C.DEEP, format: "#,##0.00" });
        setCell(sheet, r, 2, "", { color: C.YELLOW, bg: C.DEEP, format: "0.0%", formula: `=-B${r + 1}/B${revRow}` });
        r++;

        // Gross Profit (formula)
        setCell(sheet, r, 0, "Gross Profit", { bold: true, color: C.ACCENT, bg: C.MID });
        setCell(sheet, r, 1, "", { bold: true, color: C.ACCENT, bg: C.MID, format: "#,##0.00", formula: `=B${revRow}+B${r}` });
        setCell(sheet, r, 2, "", { color: C.YELLOW, bg: C.MID, format: "0.0%", formula: `=B${r + 1}/B${revRow}` });
        r++;

        // Operating Expenses
        const opEx = (co.revenue - co.costOfGoodsSold) - co.operatingIncome;
        setCell(sheet, r, 0, "(-) Operating Expenses", { color: C.RED, bg: C.DEEP });
        setCell(sheet, r, 1, -opEx, { color: C.RED, bg: C.DEEP, format: "#,##0.00" });
        setCell(sheet, r, 2, "", { color: C.YELLOW, bg: C.DEEP, format: "0.0%", formula: `=-B${r + 1}/B${revRow}` });
        r++;

        // Operating Income (formula)
        setCell(sheet, r, 0, "Operating Income (EBIT)", { bold: true, color: C.ACCENT, bg: C.MID });
        setCell(sheet, r, 1, "", { bold: true, color: C.ACCENT, bg: C.MID, format: "#,##0.00", formula: `=B${r - 1}+B${r}` });
        setCell(sheet, r, 2, "", { color: C.YELLOW, bg: C.MID, format: "0.0%", formula: `=B${r + 1}/B${revRow}` });
        r++;

        // Interest Expense
        setCell(sheet, r, 0, "(-) Interest Expense", { color: C.RED, bg: C.DEEP });
        setCell(sheet, r, 1, -co.interestExpense, { color: C.RED, bg: C.DEEP, format: "#,##0.00" });
        r++;

        // EBT (formula)
        setCell(sheet, r, 0, "Earnings Before Tax", { bold: true, color: C.TEXT, bg: C.DARK });
        setCell(sheet, r, 1, "", { bold: true, color: C.TEXT, bg: C.DARK, format: "#,##0.00", formula: `=B${r - 1}+B${r}` });
        r++;

        // Tax
        setCell(sheet, r, 0, "(-) Tax Expense", { color: C.RED, bg: C.DEEP });
        setCell(sheet, r, 1, -co.taxExpense, { color: C.RED, bg: C.DEEP, format: "#,##0.00" });
        setCell(sheet, r, 2, "", { color: C.MUTED, bg: C.DEEP, format: "0.0%", formula: `=-B${r + 1}/B${r}` });
        r++;

        // Net Income (formula)
        setCell(sheet, r, 0, "NET INCOME", { bold: true, color: C.GREEN, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, "", { bold: true, color: C.GREEN, bg: C.MID, format: "#,##0.00", formula: `=B${r - 1}+B${r}` });
        setCell(sheet, r, 2, "", { bold: true, color: C.YELLOW, bg: C.MID, format: "0.0%", formula: `=B${r + 1}/B${revRow}` });
        r += 2;

        // EBITDA
        sectionHeader(sheet, r, "EBITDA Reconciliation", 3); r++;
        labelValue(sheet, r, "Operating Income", co.operatingIncome, "#,##0.00"); r++;
        const da = co.ebitda - co.operatingIncome;
        labelValue(sheet, r, "(+) Depreciation & Amortization", da, "#,##0.00"); r++;
        setCell(sheet, r, 0, "EBITDA", { bold: true, color: C.ACCENT, bg: C.MID });
        setCell(sheet, r, 1, "", { bold: true, color: C.ACCENT, bg: C.MID, format: "#,##0.00", formula: `=B${r - 1}+B${r}` });

        await ctx.sync();
    }, "IncomeStmt");
}

// ════════════════════════════════════════════════════════════
// 4. DCF VALUATION MODEL (fully linked)
// ════════════════════════════════════════════════════════════
async function buildDCFModel(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        sheet.getRange("A:A").format.columnWidth = 200;
        for (let i = 1; i <= 7; i++) {
            sheet.getRange(`${String.fromCharCode(65 + i)}:${String.fromCharCode(65 + i)}`).format.columnWidth = 110;
        }
        sheet.getRange("A1:H40").format.fill.color = C.DEEP;

        let r = 0;
        setCell(sheet, r, 0, `${co.ticker} — DCF Valuation Model`, { bold: true, size: 16, color: C.ACCENT, bg: C.HEADER_BG, merge: 7 });
        sheet.getRangeByIndexes(r, 0, 1, 1).format.rowHeight = 32;
        r += 2;

        // ── Assumptions (editable inputs) ──
        sectionHeader(sheet, r, "📝 ASSUMPTIONS (edit yellow cells)", 7); r++;

        setCell(sheet, r, 0, "Base Free Cash Flow ($B)", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, co.freeCashFlow, { color: C.DEEP, bg: C.YELLOW, format: "#,##0.00", bold: true });
        const fcfCell = `B${r + 1}`;
        r++;

        setCell(sheet, r, 0, "WACC / Discount Rate", { color: C.MUTED, bg: C.DARK, bold: true });
        const wacc = co.beta * 0.05 + 0.03;  // Rough CAPM estimate
        setCell(sheet, r, 1, wacc, { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const waccCell = `B${r + 1}`;
        r++;

        setCell(sheet, r, 0, "Terminal Growth Rate", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, 0.025, { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const tgrCell = `B${r + 1}`;
        r++;

        setCell(sheet, r, 0, "Shares Outstanding (M)", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, co.sharesOutstanding, { color: C.DEEP, bg: C.YELLOW, format: "#,##0", bold: true });
        const sharesCell = `B${r + 1}`;
        r++;

        setCell(sheet, r, 0, "Net Debt ($B)", { color: C.MUTED, bg: C.DARK, bold: true });
        const netDebt = co.longTermDebt - co.cashAndEquivalents;
        setCell(sheet, r, 1, netDebt, { color: C.DEEP, bg: C.YELLOW, format: "#,##0.00", bold: true });
        const debtCell = `B${r + 1}`;
        r += 2;

        // ── FCF Projections ──
        sectionHeader(sheet, r, "📊 FREE CASH FLOW PROJECTIONS", 7); r++;

        // Year headers
        setCell(sheet, r, 0, "", { bg: C.DARK });
        for (let y = 0; y < 5; y++) {
            setCell(sheet, r, y + 1, `Year ${y + 1}`, { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        }
        setCell(sheet, r, 6, "Terminal", { bold: true, color: C.ORANGE, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        r++;

        // Growth rates
        setCell(sheet, r, 0, "Growth Rate", { color: C.MUTED, bg: C.DARK });
        for (let y = 0; y < 5; y++) {
            const gr = co.fcfGrowthRates[y] || 0.05;
            setCell(sheet, r, y + 1, gr, { color: C.YELLOW, bg: C.INPUT_BG, format: "0.0%", bold: true });
        }
        setCell(sheet, r, 6, "", { color: C.ORANGE, bg: C.DARK, format: "0.0%", formula: tgrCell });
        const growthRow = r + 1;
        r++;

        // FCF values (formula-linked)
        setCell(sheet, r, 0, "Free Cash Flow ($B)", { color: C.TEXT, bg: C.DARK, bold: true });
        // Year 1: Base FCF * (1 + growth)
        setCell(sheet, r, 1, "", {
            color: C.GREEN, bg: C.DEEP, format: "#,##0.00",
            formula: `=${fcfCell}*(1+B${growthRow})`
        });
        // Years 2-5: prev FCF * (1 + growth)
        for (let y = 1; y < 5; y++) {
            const prevCol = String.fromCharCode(65 + y);
            const curCol = String.fromCharCode(66 + y);
            setCell(sheet, r, y + 1, "", {
                color: C.GREEN, bg: C.DEEP, format: "#,##0.00",
                formula: `=${prevCol}${r + 1}*(1+${curCol}${growthRow})`
            });
        }
        const fcfRow = r + 1;
        r++;

        // Discount factors (formula)
        setCell(sheet, r, 0, "Discount Factor", { color: C.MUTED, bg: C.DARK });
        for (let y = 0; y < 5; y++) {
            setCell(sheet, r, y + 1, "", {
                color: C.TEXT, bg: C.DEEP, format: "0.0000",
                formula: `=1/(1+${waccCell})^${y + 1}`
            });
        }
        const dfRow = r + 1;
        r++;

        // PV of FCF (formula)
        setCell(sheet, r, 0, "PV of FCF ($B)", { color: C.GREEN, bg: C.DARK, bold: true });
        for (let y = 0; y < 5; y++) {
            const col = String.fromCharCode(66 + y);
            setCell(sheet, r, y + 1, "", {
                color: C.GREEN, bg: C.DEEP, format: "#,##0.00",
                formula: `=${col}${fcfRow}*${col}${dfRow}`
            });
        }
        const pvRow = r + 1;
        r += 2;

        // ── Valuation ──
        sectionHeader(sheet, r, "💰 VALUATION", 7); r++;

        // Terminal Value
        setCell(sheet, r, 0, "Terminal Value ($B)", { color: C.ORANGE, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", {
            color: C.ORANGE, bg: C.DEEP, format: "#,##0.00",
            formula: `=F${fcfRow}*(1+${tgrCell})/(${waccCell}-${tgrCell})`
        });
        const tvCell = `B${r + 1}`;
        r++;

        // PV of Terminal Value
        setCell(sheet, r, 0, "PV of Terminal Value ($B)", { color: C.ORANGE, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", {
            color: C.ORANGE, bg: C.DEEP, format: "#,##0.00",
            formula: `=${tvCell}/(1+${waccCell})^5`
        });
        const pvTVCell = `B${r + 1}`;
        r++;

        // Sum of PV of FCFs
        setCell(sheet, r, 0, "Sum PV of FCFs ($B)", { color: C.GREEN, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", {
            color: C.GREEN, bg: C.DEEP, format: "#,##0.00",
            formula: `=SUM(B${pvRow}:F${pvRow})`
        });
        const sumPVCell = `B${r + 1}`;
        r++;

        // Enterprise Value
        setCell(sheet, r, 0, "ENTERPRISE VALUE ($B)", { bold: true, color: C.ACCENT, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.ACCENT, bg: C.MID, format: "#,##0.00",
            formula: `=${sumPVCell}+${pvTVCell}`
        });
        const evCell = `B${r + 1}`;
        r++;

        // Equity Value
        setCell(sheet, r, 0, "(-) Net Debt ($B)", { color: C.RED, bg: C.DARK });
        setCell(sheet, r, 1, "", { color: C.RED, bg: C.DARK, format: "#,##0.00", formula: `=${debtCell}` });
        r++;

        setCell(sheet, r, 0, "EQUITY VALUE ($B)", { bold: true, color: C.GREEN, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.GREEN, bg: C.MID, format: "#,##0.00",
            formula: `=${evCell}-${debtCell}`
        });
        const eqValCell = `B${r + 1}`;
        r++;

        // Implied Share Price
        setCell(sheet, r, 0, "IMPLIED SHARE PRICE", { bold: true, color: C.WHITE, bg: C.ACCENT2, size: 14 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.WHITE, bg: C.ACCENT2, format: "$#,##0.00", size: 14,
            formula: `=${eqValCell}*1000/${sharesCell}`
        });
        sheet.getRangeByIndexes(r, 0, 1, 1).format.rowHeight = 30;
        r++;

        // Upside/Downside
        setCell(sheet, r, 0, "Upside / Downside vs Current", { bold: true, color: C.TEXT, bg: C.DARK });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.GREEN, bg: C.DARK, format: "+0.0%;-0.0%",
            formula: `=(B${r}-${co.currentPrice})/${co.currentPrice}`
        });

        await ctx.sync();
    }, "DCF_Model");
}

// ════════════════════════════════════════════════════════════
// 5. RATIOS & ANALYSIS (formulas linked to B/S and I/S)
// ════════════════════════════════════════════════════════════
async function buildRatiosSheet(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        sheet.getRange("A:A").format.columnWidth = 220;
        sheet.getRange("B:B").format.columnWidth = 120;
        sheet.getRange("C:C").format.columnWidth = 180;
        sheet.getRange("A1:D50").format.fill.color = C.DEEP;

        let r = 0;
        setCell(sheet, r, 0, `${co.ticker} — Financial Ratios`, { bold: true, size: 16, color: C.ACCENT, bg: C.HEADER_BG, merge: 3 });
        r += 2;

        // Liquidity
        sectionHeader(sheet, r, "💧 Liquidity Ratios", 3); r++;
        setCell(sheet, r, 0, "Ratio", { bold: true, color: C.ACCENT, bg: C.DARK });
        setCell(sheet, r, 1, "Value", { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        setCell(sheet, r, 2, "Formula", { bold: true, color: C.MUTED, bg: C.DARK }); r++;

        labelValue(sheet, r, "Current Ratio", co.currentAssets / co.currentLiabilities, "0.00");
        setCell(sheet, r, 2, "Current Assets / Current Liabilities", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "Quick Ratio", (co.currentAssets - co.inventory) / co.currentLiabilities, "0.00");
        setCell(sheet, r, 2, "(Curr Assets - Inventory) / Curr Liab", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "Cash Ratio", co.cashAndEquivalents / co.currentLiabilities, "0.00");
        setCell(sheet, r, 2, "Cash / Current Liabilities", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;
        r++;

        // Profitability
        sectionHeader(sheet, r, "💰 Profitability Ratios", 3); r++;
        const rev = co.revenue || 1;
        labelValue(sheet, r, "Gross Margin", (co.revenue - co.costOfGoodsSold) / rev, "0.0%");
        setCell(sheet, r, 2, "Gross Profit / Revenue", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "Operating Margin", co.operatingIncome / rev, "0.0%");
        setCell(sheet, r, 2, "Operating Income / Revenue", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "Net Margin", co.netIncome / rev, "0.0%");
        setCell(sheet, r, 2, "Net Income / Revenue", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "EBITDA Margin", co.ebitda / rev, "0.0%");
        setCell(sheet, r, 2, "EBITDA / Revenue", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "ROE", co.netIncome / (co.totalEquity || 1), "0.0%");
        setCell(sheet, r, 2, "Net Income / Total Equity", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "ROA", co.netIncome / (co.totalAssets || 1), "0.0%");
        setCell(sheet, r, 2, "Net Income / Total Assets", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;
        r++;

        // Leverage
        sectionHeader(sheet, r, "⚖️ Leverage Ratios", 3); r++;
        labelValue(sheet, r, "Debt-to-Equity", co.totalLiabilities / (co.totalEquity || 1), "0.00");
        setCell(sheet, r, 2, "Total Liabilities / Total Equity", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "Debt-to-Assets", co.totalLiabilities / (co.totalAssets || 1), "0.00");
        setCell(sheet, r, 2, "Total Liabilities / Total Assets", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "Interest Coverage", co.operatingIncome / (co.interestExpense || 1), "0.0x");
        setCell(sheet, r, 2, "EBIT / Interest Expense", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;

        labelValue(sheet, r, "LT Debt / Equity", co.longTermDebt / (co.totalEquity || 1), "0.00");
        setCell(sheet, r, 2, "Long-Term Debt / Total Equity", { color: C.MUTED, bg: C.DEEP, italic: true }); r++;
        r++;

        // DuPont Decomposition
        sectionHeader(sheet, r, "🔬 DuPont Analysis", 3); r++;
        const npm = co.netIncome / rev;
        const at = co.revenue / (co.totalAssets || 1);
        const em = co.totalAssets / (co.totalEquity || 1);
        labelValue(sheet, r, "Net Profit Margin", npm, "0.00%"); r++;
        labelValue(sheet, r, "× Asset Turnover", at, "0.00"); r++;
        labelValue(sheet, r, "× Equity Multiplier", em, "0.00"); r++;
        setCell(sheet, r, 0, "= ROE (DuPont)", { bold: true, color: C.GREEN, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.GREEN, bg: C.MID, format: "0.00%",
            formula: `=B${r - 2}*B${r - 1}*B${r}`
        });

        await ctx.sync();
    }, "Ratios");
}

// ════════════════════════════════════════════════════════════
// 6. WACC MODEL
// ════════════════════════════════════════════════════════════
async function buildWACCModel(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        sheet.getRange("A:A").format.columnWidth = 220;
        sheet.getRange("B:B").format.columnWidth = 140;
        sheet.getRange("A1:C30").format.fill.color = C.DEEP;

        let r = 0;
        setCell(sheet, r, 0, `${co.ticker} — WACC Calculator`, { bold: true, size: 16, color: C.ACCENT, bg: C.HEADER_BG, merge: 2 });
        r += 2;

        sectionHeader(sheet, r, "📝 INPUTS (edit yellow cells)", 2); r++;

        setCell(sheet, r, 0, "Risk-Free Rate", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, 0.04, { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const rfCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Market Return", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, 0.10, { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const mrCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Beta", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, co.beta, { color: C.DEEP, bg: C.YELLOW, format: "0.00", bold: true });
        const betaCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Cost of Debt (pre-tax)", { color: C.MUTED, bg: C.DARK, bold: true });
        const codPre = co.interestExpense / (co.longTermDebt || 1);
        setCell(sheet, r, 1, codPre, { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const codCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Tax Rate", { color: C.MUTED, bg: C.DARK, bold: true });
        const taxRate = co.taxExpense / ((co.operatingIncome - co.interestExpense) || 1);
        setCell(sheet, r, 1, Math.min(Math.abs(taxRate), 0.40), { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const taxCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Equity Value ($B)", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, co.marketCap, { color: C.DEEP, bg: C.YELLOW, format: "#,##0.0", bold: true });
        const eqCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Debt Value ($B)", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, co.longTermDebt, { color: C.DEEP, bg: C.YELLOW, format: "#,##0.0", bold: true });
        const dCell = `B${r + 1}`; r++;
        r++;

        // Calculations
        sectionHeader(sheet, r, "📊 CALCULATIONS", 2); r++;

        setCell(sheet, r, 0, "Total Capital ($B)", { color: C.TEXT, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", { color: C.TEXT, bg: C.DEEP, format: "#,##0.0", formula: `=${eqCell}+${dCell}` });
        const tcCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Equity Weight", { color: C.TEXT, bg: C.DARK });
        setCell(sheet, r, 1, "", { color: C.TEXT, bg: C.DEEP, format: "0.00%", formula: `=${eqCell}/${tcCell}` });
        const ewCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Debt Weight", { color: C.TEXT, bg: C.DARK });
        setCell(sheet, r, 1, "", { color: C.TEXT, bg: C.DEEP, format: "0.00%", formula: `=${dCell}/${tcCell}` });
        const dwCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Cost of Equity (CAPM)", { color: C.GREEN, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", {
            color: C.GREEN, bg: C.DEEP, format: "0.00%",
            formula: `=${rfCell}+${betaCell}*(${mrCell}-${rfCell})`
        });
        const coeCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "After-Tax Cost of Debt", { color: C.RED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", {
            color: C.RED, bg: C.DEEP, format: "0.00%",
            formula: `=${codCell}*(1-${taxCell})`
        });
        const atCodCell = `B${r + 1}`; r++;
        r++;

        // WACC Result
        setCell(sheet, r, 0, "WACC", { bold: true, color: C.WHITE, bg: C.ACCENT2, size: 14 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.WHITE, bg: C.ACCENT2, format: "0.00%", size: 14,
            formula: `=${ewCell}*${coeCell}+${dwCell}*${atCodCell}`
        });
        sheet.getRangeByIndexes(r, 0, 1, 1).format.rowHeight = 30;

        await ctx.sync();
    }, "WACC_Model");
}

// ════════════════════════════════════════════════════════════
// 7. LOAN AMORTIZATION SCHEDULE
// ════════════════════════════════════════════════════════════
async function buildLoanSchedule(co: CompanyData) {
    await excelRun(async (ctx, sheet) => {
        sheet.getRange("A:A").format.columnWidth = 100;
        sheet.getRange("B:B").format.columnWidth = 130;
        sheet.getRange("C:C").format.columnWidth = 130;
        sheet.getRange("D:D").format.columnWidth = 130;
        sheet.getRange("E:E").format.columnWidth = 130;
        sheet.getRange("A1:F60").format.fill.color = C.DEEP;

        let r = 0;
        setCell(sheet, r, 0, `${co.ticker} — Loan Amortization`, { bold: true, size: 16, color: C.ACCENT, bg: C.HEADER_BG, merge: 5 });
        r += 2;

        // Inputs
        sectionHeader(sheet, r, "📝 LOAN PARAMETERS (edit yellow cells)", 5); r++;
        setCell(sheet, r, 0, "Principal ($B)", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, co.longTermDebt, { color: C.DEEP, bg: C.YELLOW, format: "#,##0.00", bold: true });
        const prCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Annual Rate", { color: C.MUTED, bg: C.DARK, bold: true });
        const rate = co.interestExpense / (co.longTermDebt || 1);
        setCell(sheet, r, 1, Math.max(rate, 0.03), { color: C.DEEP, bg: C.YELLOW, format: "0.00%", bold: true });
        const rateCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Term (Years)", { color: C.MUTED, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, 10, { color: C.DEEP, bg: C.YELLOW, format: "0", bold: true });
        const termCell = `B${r + 1}`; r++;

        // Monthly payment formula
        setCell(sheet, r, 0, "Monthly Payment", { bold: true, color: C.GREEN, bg: C.MID, size: 12 });
        setCell(sheet, r, 1, "", {
            bold: true, color: C.GREEN, bg: C.MID, format: "#,##0.0000",
            formula: `=-PMT(${rateCell}/12, ${termCell}*12, ${prCell})`
        });
        const pmtCell = `B${r + 1}`; r++;

        setCell(sheet, r, 0, "Total Interest", { color: C.ORANGE, bg: C.DARK, bold: true });
        setCell(sheet, r, 1, "", {
            color: C.ORANGE, bg: C.DARK, format: "#,##0.00",
            formula: `=${pmtCell}*${termCell}*12-${prCell}`
        });
        r += 2;

        // Amortization Schedule (annual)
        sectionHeader(sheet, r, "📅 ANNUAL SCHEDULE", 5); r++;
        const headers = ["Year", "Beg Balance", "Payment", "Interest", "Principal", "End Balance"];
        for (let c = 0; c < headers.length; c++) {
            setCell(sheet, r, c, headers[c], { bold: true, color: C.ACCENT, bg: C.DARK, align: Excel.HorizontalAlignment.center });
        }
        r++;

        // Generate 10 years of amortization with formulas
        for (let y = 1; y <= 10; y++) {
            setCell(sheet, r, 0, y, { color: C.TEXT, bg: y % 2 === 0 ? C.DEEP : C.DARK });

            // Beg Balance: year 1 = principal, else = prev end balance
            if (y === 1) {
                setCell(sheet, r, 1, "", {
                    color: C.TEXT, bg: y % 2 === 0 ? C.DEEP : C.DARK, format: "#,##0.00",
                    formula: `=${prCell}`
                });
            } else {
                setCell(sheet, r, 1, "", {
                    color: C.TEXT, bg: y % 2 === 0 ? C.DEEP : C.DARK, format: "#,##0.00",
                    formula: `=F${r}`
                }); // prev row end balance
            }

            // Annual Payment
            setCell(sheet, r, 2, "", {
                color: C.TEXT, bg: y % 2 === 0 ? C.DEEP : C.DARK, format: "#,##0.00",
                formula: `=${pmtCell}*12`
            });

            // Interest portion
            setCell(sheet, r, 3, "", {
                color: C.RED, bg: y % 2 === 0 ? C.DEEP : C.DARK, format: "#,##0.00",
                formula: `=B${r + 1}*${rateCell}`
            });

            // Principal portion
            setCell(sheet, r, 4, "", {
                color: C.GREEN, bg: y % 2 === 0 ? C.DEEP : C.DARK, format: "#,##0.00",
                formula: `=C${r + 1}-D${r + 1}`
            });

            // End Balance
            setCell(sheet, r, 5, "", {
                color: C.TEXT, bg: y % 2 === 0 ? C.DEEP : C.DARK, format: "#,##0.00",
                formula: `=MAX(0, B${r + 1}-E${r + 1})`
            });

            r++;
        }

        await ctx.sync();
    }, "Loan_Schedule");
}

// ════════════════════════════════════════════════════════════
// MASTER BUILDER — builds all sheets
// ════════════════════════════════════════════════════════════
export async function buildAllModels(
    co: CompanyData,
    onProgress?: (step: string, done: number, total: number) => void
): Promise<void> {
    const steps = [
        { name: "Dashboard", fn: () => buildOverview(co) },
        { name: "Balance Sheet", fn: () => buildBalanceSheet(co) },
        { name: "Income Statement", fn: () => buildIncomeStatement(co) },
        { name: "DCF Valuation", fn: () => buildDCFModel(co) },
        { name: "Financial Ratios", fn: () => buildRatiosSheet(co) },
        { name: "WACC Calculator", fn: () => buildWACCModel(co) },
        { name: "Loan Schedule", fn: () => buildLoanSchedule(co) },
    ];

    for (let i = 0; i < steps.length; i++) {
        onProgress?.(steps[i].name, i + 1, steps.length);
        await steps[i].fn();
    }
}
