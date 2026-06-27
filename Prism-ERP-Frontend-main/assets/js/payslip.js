/* ============================================================
   Prism-ERP — Payslip Generation page logic
   ============================================================
   Pulls employees from the backend, computes a semi-monthly
   payslip for each (see payroll-calc.js), and renders the list.
   Managers/admins see every employee; an employee account only
   ever sees their own payslip.
   ============================================================ */

const PERIOD_LABELS = {
    "period-1": "June 1–15, 2026",
    "period-2": "June 16–30, 2026",
    "period-3": "July 1–15, 2026"
};

// Cache of computed payslips, keyed by employee_id, so the modal
// can read the exact figures shown in the table without recomputing.
const payslipCache = {};

function peso(value) {
    return "₱" + Number(value).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDeductionName(key) {
    const names = {
        sss: "SSS",
        philhealth: "PhilHealth",
        pagibig: "Pag-IBIG",
        tax: "Withholding Tax"
    };
    return names[key] || key;
}

async function loadPayslips() {
    const tbody = document.getElementById("payslipTableBody");
    const periodSelect = document.getElementById("periodSelect");
    const periodLabel = PERIOD_LABELS[periodSelect.value] || periodSelect.options[periodSelect.selectedIndex].text;

    document.getElementById("periodHeading").textContent = `Period: ${periodLabel}`;

    let employees;
    try {
        employees = await apiFetch("/employees");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">Couldn't load employees: ${err.message}</td></tr>`;
        return;
    }

    // Only active employees with a salary on file can have a payslip generated.
    let visible = employees.filter((e) => e.status === "active" && e.salary);

    // Role-based scoping: employees only ever see their own payslip.
    if (currentSession.role === "employee") {
        visible = visible.filter((e) => e.employee_id === currentSession.employee_id);
    }

    if (visible.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No payslips available for this period.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    visible.forEach((emp) => {
        const payslip = computePayslip(emp, 0, periodLabel);
        payslipCache[emp.employee_id] = payslip;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>EMP-${String(emp.employee_id).padStart(3, "0")}</td>
            <td>${payslip.name}</td>
            <td>${payslip.position}</td>
            <td class="green">${peso(payslip.netPay)}</td>
            <td><span class="status success">READY</span></td>
            <td>
                <button class="table-btn primary" onclick="viewPayslip(${emp.employee_id})">
                    <i class="fas fa-print"></i>
                    View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewPayslip(employeeId) {
    const slip = payslipCache[employeeId];
    if (!slip) return;

    document.getElementById("empId").textContent = `EMP-${String(slip.employeeId).padStart(3, "0")}`;
    document.getElementById("empName").textContent = slip.name;
    document.getElementById("empPosition").textContent = slip.position;
    document.getElementById("empPeriod").textContent = slip.period;

    document.getElementById("basicPay").textContent = peso(slip.basicPay);
    document.getElementById("overtimePay").textContent = peso(slip.overtimePay);

    const deductionList = document.getElementById("deductionList");
    deductionList.innerHTML = "";
    for (const [key, value] of Object.entries(slip.deductions)) {
        const row = document.createElement("p");
        row.innerHTML = `<span>${formatDeductionName(key)}</span><span>${peso(value)}</span>`;
        deductionList.appendChild(row);
    }

    document.getElementById("grossPay").textContent = peso(slip.gross);
    document.getElementById("totalDeduction").textContent = peso(slip.totalDeductions);
    document.getElementById("netPay").textContent = peso(slip.netPay);

    document.getElementById("payslipModal").classList.add("show");
}

function closePayslip() {
    document.getElementById("payslipModal").classList.remove("show");
}

function printPayslip() {
    const content = document.getElementById("printArea").innerHTML;
    const win = window.open("", "", "width=900,height=900");

    win.document.write(`
        <html>
        <head><title>Payslip</title></head>
        <body>${content}</body>
        </html>
    `);

    win.document.close();
    win.print();
}

document.addEventListener("DOMContentLoaded", () => {
    loadPayslips();
    document.getElementById("periodSelect").addEventListener("change", loadPayslips);
});
