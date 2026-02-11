/**
 * Sensitivity Analysis Engine
 * 
 * One-way sensitivity analysis and elasticity for any model function.
 */

export interface SensitivityInput {
    baseInputs: Record<string, number>;
    targetParameter: string;
    minValue: number;
    maxValue: number;
    steps: number;
    modelFunction: (inputs: Record<string, number>) => number;
}

export interface SensitivityResult {
    parameter: string;
    values: number[];
    outputs: number[];
    percentageChange: number[];
    elasticity: number;
    baseOutput: number;
}

export function runSensitivity(input: SensitivityInput): SensitivityResult {
    const { baseInputs, targetParameter, minValue, maxValue, steps, modelFunction } = input;

    const stepSize = (maxValue - minValue) / Math.max(steps - 1, 1);
    const values: number[] = [];
    const outputs: number[] = [];

    for (let i = 0; i < steps; i++) {
        const val = minValue + i * stepSize;
        values.push(round(val, 4));

        const currentInputs = { ...baseInputs, [targetParameter]: val };
        outputs.push(round(modelFunction(currentInputs), 6));
    }

    const baseOutput = outputs[0];
    const percentageChange = outputs.map(o =>
        baseOutput !== 0 ? round(((o - baseOutput) / Math.abs(baseOutput)) * 100, 2) : 0
    );

    // Elasticity: % change output / % change input (using endpoints)
    const baseVal = baseInputs[targetParameter] ?? values[0];
    const perturbedInputs = { ...baseInputs, [targetParameter]: baseVal * 1.01 };
    const perturbedOutput = modelFunction(perturbedInputs);
    const elasticity = baseOutput !== 0
        ? round(((perturbedOutput - baseOutput) / baseOutput) / 0.01, 4)
        : 0;

    return { parameter: targetParameter, values, outputs, percentageChange, elasticity, baseOutput: round(baseOutput, 6) };
}

/**
 * Generate tornado chart data by running sensitivity on multiple parameters.
 */
export interface TornadoItem {
    parameter: string;
    lowOutput: number;
    highOutput: number;
    swing: number;
}

export function generateTornadoData(
    baseInputs: Record<string, number>,
    parameters: string[],
    perturbPct: number,
    modelFunction: (inputs: Record<string, number>) => number
): TornadoItem[] {
    const items: TornadoItem[] = [];

    for (const param of parameters) {
        const baseVal = baseInputs[param];
        if (baseVal === undefined) continue;

        const lowInputs = { ...baseInputs, [param]: baseVal * (1 - perturbPct) };
        const highInputs = { ...baseInputs, [param]: baseVal * (1 + perturbPct) };

        const lowOutput = modelFunction(lowInputs);
        const highOutput = modelFunction(highInputs);

        items.push({
            parameter: param,
            lowOutput: round(lowOutput, 4),
            highOutput: round(highOutput, 4),
            swing: round(Math.abs(highOutput - lowOutput), 4),
        });
    }

    // Sort by swing descending (largest impact first)
    items.sort((a, b) => b.swing - a.swing);
    return items;
}

function round(v: number, d: number): number {
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
}
