/* ============================================================
   Prism-ERP — Payslip Calculation
   ============================================================
   Computes a semi-monthly (15-day) payslip for an employee from
   their monthly basic salary. Statutory deductions follow the
   simplified 2023 BIR/SSS/PhilHealth tables commonly used by PH
   payroll systems. These are estimates for demo purposes — swap
   in the official contribution tables if this goes to production.
   ============================================================ */

// Employee's monthly salary -> SSS employee contribution (per cutoff).
// Mirrors the 2023 SSS table: 4.5% of monthly salary, floor 135, cap 1125.
function computeSSS(monthlySalary) {
    const contribution = monthlySalary * 0.045;
    return Math.min(Math.max(contribution, 135), 1125) / 2; // half per cutoff
}

// PhilHealth: 5% of monthly basic salary, split 50/50 with employer,
// floored at a 10,000 salary base and capped at a 100,000 salary base.
function computePhilHealth(monthlySalary) {
    const basis = Math.min(Math.max(monthlySalary, 10000), 100000);
    const employeeShare = (basis * 0.05) / 2;
    return employeeShare / 2; // half per cutoff
}

// Pag-IBIG: flat ₱100/month employee share (standard flat-rate setup).
function computePagibig() {
    return 100 / 2; // half per cutoff
}

// BIR withholding tax — 2023 revised semi-monthly table (TRAIN law).
function computeWithholdingTax(semiMonthlyTaxableIncome) {
    const brackets = [
        { upTo: 10417, base: 0, rate: 0, over: 0 },
        { upTo: 16666, base: 0, rate: 0.15, over: 10417 },
        { upTo: 33332, base: 750, rate: 0.20, over: 16667 },
        { upTo: 83332, base: 4000, rate: 0.25, over: 33333 },
        { upTo: 333332, base: 16750, rate: 0.30, over: 83333 },
        { upTo: 666666, base: 91750, rate: 0.32, over: 333333 },
        { upTo: Infinity, base: 200833.33, rate: 0.35, over: 666667 }
    ];

    const bracket = brackets.find((b) => semiMonthlyTaxableIncome <= b.upTo);
    const excess = Math.max(semiMonthlyTaxableIncome - bracket.over, 0);
    return bracket.base + excess * bracket.rate;
}

/**
 * Builds a full semi-monthly payslip breakdown for an employee.
 * @param {{employee_id:number, first_name:string, last_name:string, position:string, salary:number}} employee
 * @param {number} overtimePay - optional overtime for this cutoff (defaults 0)
 * @param {string} periodLabel - e.g. "June 1–15, 2026"
 */
function computePayslip(employee, overtimePay = 0, periodLabel = "") {
    const monthlySalary = Number(employee.salary) || 0;
    const basicPay = monthlySalary / 2; // semi-monthly basic pay

    const sss = computeSSS(monthlySalary);
    const philhealth = computePhilHealth(monthlySalary);
    const pagibig = computePagibig();

    const taxableIncome = basicPay + overtimePay - sss - philhealth - pagibig;
    const tax = computeWithholdingTax(Math.max(taxableIncome, 0));

    const gross = basicPay + overtimePay;
    const totalDeductions = sss + philhealth + pagibig + tax;
    const netPay = gross - totalDeductions;

    return {
        employeeId: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name}`,
        position: employee.position || "—",
        period: periodLabel,

        basicPay,
        overtimePay,
        gross,

        deductions: {
            sss,
            philhealth,
            pagibig,
            tax
        },
        totalDeductions,

        netPay
    };
}
