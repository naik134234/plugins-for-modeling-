/**
 * Loan Amortization Engine
 * 
 * EMI calculation, amortization schedule, total interest, principal/interest breakdown.
 */

export interface LoanInput {
    principal: number;
    annualRate: number;     // decimal (0.08 = 8%)
    termMonths: number;
    extraPayment?: number;  // optional extra monthly payment
}

export interface LoanResult {
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
    effectiveRate: number;
    schedule: AmortizationRow[];
}

export interface AmortizationRow {
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
    cumulativeInterest: number;
    cumulativePrincipal: number;
}

export function calculateLoan(input: LoanInput): LoanResult {
    const { principal: P, annualRate: r, termMonths: n, extraPayment = 0 } = input;

    if (P <= 0 || n <= 0) throw new Error("Principal and term must be positive.");

    const monthlyRate = r / 12;

    // EMI = P * r(1+r)^n / ((1+r)^n - 1)
    let emi: number;
    if (monthlyRate === 0) {
        emi = P / n;
    } else {
        const factor = Math.pow(1 + monthlyRate, n);
        emi = P * monthlyRate * factor / (factor - 1);
    }

    const schedule: AmortizationRow[] = [];
    let balance = P;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let month = 0;

    while (balance > 0.01 && month < n + 120) { // safety cap
        month++;
        const interest = balance * monthlyRate;
        const totalPayment = Math.min(emi + extraPayment, balance + interest);
        const principalPaid = totalPayment - interest;
        balance = Math.max(0, balance - principalPaid);

        totalInterest += interest;
        totalPrincipal += principalPaid;

        schedule.push({
            month,
            payment: r2(totalPayment),
            principal: r2(principalPaid),
            interest: r2(interest),
            balance: r2(balance),
            cumulativeInterest: r2(totalInterest),
            cumulativePrincipal: r2(totalPrincipal),
        });
    }

    const totalPayment = totalInterest + P;
    const effectiveRate = totalInterest / P;

    return {
        monthlyPayment: r2(emi),
        totalPayment: r2(totalPayment),
        totalInterest: r2(totalInterest),
        effectiveRate: r4(effectiveRate),
        schedule,
    };
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
