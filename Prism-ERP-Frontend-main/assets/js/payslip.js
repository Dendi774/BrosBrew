function peso(value){
    return "₱" + value.toLocaleString("en-PH", {
        minimumFractionDigits:2,
        maximumFractionDigits:2
    });
}

function formatDeductionName(key){

    const names = {
        sss: "SSS",
        philhealth: "PhilHealth",
        pagibig: "Pag-IBIG",
        tax: "Withholding Tax",
        lateDeduction: "Late Deduction",
        absenceDeduction: "Absence Deduction"
    };

    return names[key] || key;
}

function viewPayslip(empId){

    const emp = payrollData[empId];

    const gross =
        emp.basicPay +
        emp.overtimePay +
        emp.cola +
        emp.allowances;

    const deductions = Object.values(emp.deductions)
        .reduce((total, amount) => total + amount, 0);

    const net = gross - deductions;

    document.getElementById("empId").textContent = emp.employeeId;
    document.getElementById("empName").textContent = emp.name;
    document.getElementById("empPosition").textContent = emp.position;
    document.getElementById("empDepartment").textContent = emp.department;

    document.getElementById("basicPay").textContent = peso(emp.basicPay);
    document.getElementById("overtimePay").textContent = peso(emp.overtimePay);
    document.getElementById("cola").textContent = peso(emp.cola);
    document.getElementById("allowances").textContent = peso(emp.allowances);

    const deductionList =
    document.getElementById("deductionList");

    deductionList.innerHTML = "";

    for (const [key, value] of Object.entries(emp.deductions)) {

        const row = document.createElement("p");

        row.innerHTML = `
            <span>${formatDeductionName(key)}</span>
            <span>${peso(value)}</span>
        `;

        deductionList.appendChild(row);
    }

    document.getElementById("grossPay").textContent = peso(gross);
    document.getElementById("totalDeduction").textContent = peso(deductions);
    document.getElementById("netPay").textContent = peso(net);

    document.getElementById("payslipModal").style.display = "flex";
}

function closePayslip(){
    document.getElementById("payslipModal").style.display = "none";
}

function printPayslip(){

    const content =
        document.getElementById("printArea").innerHTML;

    const win = window.open("", "", "width=900,height=900");

    win.document.write(`
        <html>
        <head>
            <title>Payslip</title>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `);

    win.document.close();
    win.print();
}