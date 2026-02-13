/// <reference types="office-js" />
/* global Excel */

/**
 * Enhanced Excel Service
 * 
 * Provides rich functions for writing structured calculation results
 * to Excel worksheets with formatting, linked cells, and charts.
 */

export interface ExcelData {
    values: (string | number | boolean)[][];
    address: string;
}

// ═══ Color constants ═══
const HEADER_BG = "#1e1b4b";     // deep indigo
const HEADER_FG = "#e0e7ff";     // light indigo
const LABEL_BG = "#1e293b";      // slate
const LABEL_FG = "#94a3b8";      // muted text
const VALUE_BG = "#0f172a";      // dark bg
const VALUE_FG = "#f1f5f9";      // bright text
const ACCENT_FG = "#818cf8";     // indigo accent
const POS_FG = "#22c55e";        // green
const NEG_FG = "#ef4444";        // red
const BORDER_COLOR = "#334155";  // slate border

type CellValue = string | number | boolean;

export const ExcelService = {
    /**
     * Get or create a worksheet by name
     */
    getOrCreateSheet: async (sheetName: string): Promise<void> => {
        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load("items/name");
            await context.sync();

            const exists = sheets.items.find(s => s.name === sheetName);
            if (!exists) {
                const newSheet = sheets.add(sheetName);
                newSheet.activate();
            } else {
                exists.activate();
            }
            await context.sync();
        });
    },

    /**
     * Write a titled results block to a specific worksheet.
     * Creates the sheet if needed, clears it, writes formatted data.
     * 
     * @param sheetName - name of the worksheet
     * @param title - main title in merged top row
     * @param subtitle - subtitle/description
     * @param sections - array of { heading, rows: [label, value][] } blocks
     * @param tableData - optional table { headers, rows } to append
     */
    writeResultsToSheet: async (
        sheetName: string,
        title: string,
        subtitle: string,
        sections: { heading: string; rows: [string, CellValue][] }[],
        tableData?: { headers: string[]; rows: CellValue[][] },
        linkedCells?: { label: string; formula: string }[]
    ): Promise<string> => {
        return await Excel.run(async (context) => {
            // Get or create sheet
            const sheets = context.workbook.worksheets;
            sheets.load("items/name");
            await context.sync();

            let sheet: Excel.Worksheet;
            const existing = sheets.items.find(s => s.name === sheetName);
            if (existing) {
                sheet = existing;
                sheet.activate();
                // Clear previous content
                const usedRange = sheet.getUsedRangeOrNullObject();
                usedRange.load("isNullObject");
                await context.sync();
                if (!usedRange.isNullObject) {
                    usedRange.clear();
                }
            } else {
                sheet = sheets.add(sheetName);
                sheet.activate();
            }
            await context.sync();

            let row = 0;

            // ── Title ──
            const titleRange = sheet.getRangeByIndexes(row, 0, 1, 6);
            titleRange.merge();
            titleRange.values = [[title.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim()]];
            titleRange.format.font.size = 16;
            titleRange.format.font.bold = true;
            titleRange.format.font.color = ACCENT_FG;
            titleRange.format.fill.color = HEADER_BG;
            titleRange.format.horizontalAlignment = Excel.HorizontalAlignment.left;
            titleRange.format.rowHeight = 30;
            row++;

            // ── Subtitle ──
            const subRange = sheet.getRangeByIndexes(row, 0, 1, 6);
            subRange.merge();
            subRange.values = [[subtitle]];
            subRange.format.font.size = 10;
            subRange.format.font.italic = true;
            subRange.format.font.color = LABEL_FG;
            subRange.format.fill.color = HEADER_BG;
            row++;

            // ── Timestamp ──
            const tsRange = sheet.getRangeByIndexes(row, 0, 1, 6);
            tsRange.merge();
            tsRange.values = [[`Generated: ${new Date().toLocaleString()}`]];
            tsRange.format.font.size = 9;
            tsRange.format.font.color = LABEL_FG;
            tsRange.format.fill.color = VALUE_BG;
            row++;

            // Spacer
            row++;

            // Sync title block
            await context.sync();

            // ── Sections (label-value pairs) ──
            for (const section of sections) {
                // Section heading
                const headRange = sheet.getRangeByIndexes(row, 0, 1, 2);
                headRange.merge();
                headRange.values = [[section.heading.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim()]];
                headRange.format.font.bold = true;
                headRange.format.font.size = 12;
                headRange.format.font.color = HEADER_FG;
                headRange.format.fill.color = HEADER_BG;
                headRange.format.borders.getItem("EdgeBottom").color = ACCENT_FG;
                row++;

                // Label-value rows
                for (const [label, value] of section.rows) {
                    const labelCell = sheet.getRangeByIndexes(row, 0, 1, 1);
                    const valueCell = sheet.getRangeByIndexes(row, 1, 1, 1);

                    labelCell.values = [[label]];
                    labelCell.format.font.color = LABEL_FG;
                    labelCell.format.fill.color = LABEL_BG;
                    labelCell.format.font.size = 11;
                    labelCell.format.borders.getItem("EdgeBottom").color = BORDER_COLOR;

                    valueCell.values = [[value]];
                    valueCell.format.font.bold = true;
                    valueCell.format.font.color = VALUE_FG;
                    valueCell.format.fill.color = VALUE_BG;
                    valueCell.format.font.size = 11;
                    valueCell.format.borders.getItem("EdgeBottom").color = BORDER_COLOR;

                    // Color positive/negative numbers
                    if (typeof value === "number") {
                        valueCell.numberFormat = [["#,##0.00"]];
                        if (value > 0) valueCell.format.font.color = POS_FG;
                        if (value < 0) valueCell.format.font.color = NEG_FG;
                    } else if (typeof value === "string" && value.includes("%")) {
                        valueCell.format.font.color = ACCENT_FG;
                    }

                    row++;
                }
                row++; // spacer between sections

                // Sync after each section so partial data persists
                await context.sync();
            }

            // ── Linked Cells (formulas) ──
            if (linkedCells && linkedCells.length > 0) {
                const lcHeadRange = sheet.getRangeByIndexes(row, 0, 1, 2);
                lcHeadRange.merge();
                lcHeadRange.values = [["Linked Calculations"]];
                lcHeadRange.format.font.bold = true;
                lcHeadRange.format.font.size = 12;
                lcHeadRange.format.font.color = HEADER_FG;
                lcHeadRange.format.fill.color = HEADER_BG;
                row++;

                for (const lc of linkedCells) {
                    const labelCell = sheet.getRangeByIndexes(row, 0, 1, 1);
                    const formulaCell = sheet.getRangeByIndexes(row, 1, 1, 1);

                    labelCell.values = [[lc.label]];
                    labelCell.format.font.color = LABEL_FG;
                    labelCell.format.fill.color = LABEL_BG;

                    formulaCell.formulas = [[lc.formula]];
                    formulaCell.format.font.bold = true;
                    formulaCell.format.font.color = ACCENT_FG;
                    formulaCell.format.fill.color = VALUE_BG;
                    formulaCell.numberFormat = [["#,##0.00"]];
                    row++;
                }
                row++;

                await context.sync();
            }

            // ── Data Table ──
            if (tableData && tableData.rows.length > 0) {
                const cols = tableData.headers.length;

                // Table header
                const thRange = sheet.getRangeByIndexes(row, 0, 1, cols);
                thRange.values = [tableData.headers];
                thRange.format.font.bold = true;
                thRange.format.font.color = HEADER_FG;
                thRange.format.fill.color = HEADER_BG;
                thRange.format.font.size = 10;
                thRange.format.borders.getItem("EdgeBottom").color = ACCENT_FG;
                thRange.format.borders.getItem("EdgeBottom").weight = Excel.BorderWeight.medium;
                row++;

                // Table rows
                for (let i = 0; i < tableData.rows.length; i++) {
                    const tr = tableData.rows[i];
                    const trRange = sheet.getRangeByIndexes(row, 0, 1, cols);
                    trRange.values = [tr];
                    trRange.format.fill.color = i % 2 === 0 ? VALUE_BG : LABEL_BG;
                    trRange.format.font.color = VALUE_FG;
                    trRange.format.font.size = 10;
                    trRange.format.borders.getItem("EdgeBottom").color = BORDER_COLOR;

                    // Format numbers
                    for (let c = 0; c < cols; c++) {
                        if (typeof tr[c] === "number") {
                            const cell = sheet.getRangeByIndexes(row, c, 1, 1);
                            cell.numberFormat = [["#,##0.00"]];
                        }
                    }
                    row++;
                }
                row++;

                await context.sync();
            }

            // ── Auto-fit columns ──
            try {
                const fullRange = sheet.getRangeByIndexes(0, 0, Math.max(row, 1), 6);
                fullRange.format.autofitColumns();
                sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 200;
                sheet.getRangeByIndexes(0, 1, 1, 1).format.columnWidth = 160;
            } catch { /* autofit may fail on empty sheets */ }

            await context.sync();

            return sheetName;
        });
    },

    /**
     * Write raw input data to a sheet for cell linking
     */
    writeInputData: async (
        sheetName: string,
        startRow: number,
        inputs: [string, CellValue][]
    ): Promise<{ [label: string]: string }> => {
        const cellRefs: { [label: string]: string } = {};

        await Excel.run(async (context) => {
            const sheets = context.workbook.worksheets;
            sheets.load("items/name");
            await context.sync();

            let sheet: Excel.Worksheet;
            const existing = sheets.items.find(s => s.name === sheetName);
            if (existing) {
                sheet = existing;
            } else {
                sheet = sheets.add(sheetName);
            }

            // Write inputs in cols D-E (to the right of results)
            for (let i = 0; i < inputs.length; i++) {
                const r = startRow + i;
                const labelCell = sheet.getRangeByIndexes(r, 3, 1, 1);
                const valueCell = sheet.getRangeByIndexes(r, 4, 1, 1);

                labelCell.values = [[inputs[i][0]]];
                labelCell.format.font.color = LABEL_FG;
                labelCell.format.fill.color = LABEL_BG;
                labelCell.format.font.size = 10;

                valueCell.values = [[inputs[i][1]]];
                valueCell.format.font.bold = true;
                valueCell.format.font.color = ACCENT_FG;
                valueCell.format.fill.color = VALUE_BG;
                valueCell.format.font.size = 10;

                if (typeof inputs[i][1] === "number") {
                    valueCell.numberFormat = [["#,##0.0000"]];
                }

                // Build cell reference like 'VaR'!$E$5
                const colLetter = "E";
                const cellRef = `'${sheetName}'!$${colLetter}$${r + 1}`;
                cellRefs[inputs[i][0]] = cellRef;
            }

            // Header for inputs section
            const inputHeader = sheet.getRangeByIndexes(startRow - 1, 3, 1, 2);
            inputHeader.merge();
            inputHeader.values = [["📥 Input Parameters"]];
            inputHeader.format.font.bold = true;
            inputHeader.format.font.color = HEADER_FG;
            inputHeader.format.fill.color = HEADER_BG;

            sheet.getRangeByIndexes(startRow - 1, 3, inputs.length + 1, 2).format.autofitColumns();
            sheet.getRangeByIndexes(0, 3, 1, 1).format.columnWidth = 150;
            sheet.getRangeByIndexes(0, 4, 1, 1).format.columnWidth = 120;

            await context.sync();
        });

        return cellRefs;
    },

    /**
     * Create a chart from a range on a specific sheet
     */
    createChartOnSheet: async (
        sheetName: string,
        chartType: Excel.ChartType,
        dataRange: string,
        chartTitle: string,
        top: number = 20,
        left: number = 400
    ): Promise<void> => {
        await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItem(sheetName);
            const range = sheet.getRange(dataRange);
            const chart = sheet.charts.add(chartType, range, Excel.ChartSeriesBy.auto);
            chart.title.text = chartTitle;
            chart.title.format.font.color = VALUE_FG;
            chart.top = top;
            chart.left = left;
            chart.width = 400;
            chart.height = 280;
            chart.format.fill.setSolidColor(VALUE_BG);
            chart.legend.position = Excel.ChartLegendPosition.bottom;
            await context.sync();
        });
    },

    /**
     * Get selected range data
     */
    getSelectedRangeData: async (): Promise<ExcelData> => {
        return await Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange();
            range.load("values");
            range.load("address");
            await context.sync();
            return { values: range.values, address: range.address };
        });
    },

    /**
     * Write data to selection
     */
    writeDataToSelection: async (data: CellValue[][]): Promise<void> => {
        await Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange();
            const targetRange = range.getResizedRange(data.length - 1, data[0].length - 1);
            targetRange.values = data;
            targetRange.format.autofitColumns();
            await context.sync();
        });
    },
};
