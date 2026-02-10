/// <reference types="office-js" />
/* global Excel */


export interface ExcelData {
    values: (string | number | boolean)[][];
    address: string;
}

export const ExcelService = {
    /**
     * getSelectedRangeData
     * Retrieves values from the currently selected range in Excel.
     */
    getSelectedRangeData: async (): Promise<ExcelData> => {
        try {
            return await Excel.run(async (context) => {
                const range = context.workbook.getSelectedRange();
                range.load("values");
                range.load("address");

                await context.sync();

                return {
                    values: range.values,
                    address: range.address,
                };
            });
        } catch (error) {
            console.error("Error getting selected range:", error);
            throw error;
        }
    },

    /**
     * writeDataToRange
     * Writes a 2D array of values to the currently selected range or a specific cell.
     * If validRange is provided, it tries to write there; otherwise writes to active selection.
     */
    writeDataToSelection: async (data: (string | number | boolean)[][]) => {
        try {
            return await Excel.run(async (context) => {
                const range = context.workbook.getSelectedRange();

                // Resize range to fit data
                const rowCount = data.length;
                const colCount = data[0].length;
                const targetRange = range.getResizedRange(rowCount - 1, colCount - 1);

                targetRange.values = data;
                targetRange.format.autofitColumns();

                await context.sync();
            });
        } catch (error) {
            console.error("Error writing data:", error);
            throw error;
        }
    },

    /**
     * createChart
     * Creates a chart from the selected data.
     */
    createChart: async (type: Excel.ChartType = Excel.ChartType.line, dataRangeAddress?: string) => {
        try {
            await Excel.run(async (context) => {
                const sheet = context.workbook.worksheets.getActiveWorksheet();
                let range;

                if (dataRangeAddress) {
                    range = sheet.getRange(dataRangeAddress);
                } else {
                    range = context.workbook.getSelectedRange();
                }

                const chart = sheet.charts.add(type, range, Excel.ChartSeriesBy.auto);

                chart.title.text = "Risk Analysis";
                chart.legend.position = Excel.ChartLegendPosition.right;
                chart.legend.format.fill.setSolidColor("white");
                chart.dataLabels.showValue = false;

                await context.sync();
            });
        } catch (error) {
            console.error("Error creating chart:", error);
            throw error;
        }
    }
};
