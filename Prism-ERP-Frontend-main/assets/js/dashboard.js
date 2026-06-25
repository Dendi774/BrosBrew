// ===============================
// WEEKLY SALES CHART
// ===============================

const salesCtx = document.getElementById('salesChart');
if (salesCtx) {
    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: [
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
                'Sun'
            ],
            datasets: [{
                label: 'Sales',
                data: [
                    50000,
                    62000,
                    55000,
                    70000,
                    83200,
                    71000,
                    30000
                ],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===============================
// SALES BY CATEGORY
// ===============================

const categoryCtx = document.getElementById('categoryChart');

if (categoryCtx) {
    new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [
                'Electronics',
                'Apparel',
                'Food & Beverage',
                'Office Supplies',
                'Others'
            ],

            datasets: [{
                data: [35, 25, 18, 12, 10],

                backgroundColor: [
                    '#2563eb',
                    '#16a34a',
                    '#f97316',
                    '#8b5cf6',
                    '#94a3b8'
                ],

                borderWidth: 0
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            cutout: '70%',

            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20
                    }
                }
            }
        }
    });
}


// ===============================
// Current Date pare 
// ===============================
const dateElement = document.getElementById("currentDate");

const options = {
    year: "numeric",
    month: "short",
    day: "numeric"
};

if (dateElement) {
    dateElement.textContent =
        new Date().toLocaleDateString("en-US", options);
}

// Pending Sales Orders Count

const pendingOrders =
    salesOrders.filter(
        order => order.status === "Pending"
    );

document.getElementById(
    "pendingOrders"
).textContent = pendingOrders.length;

const tableBody =
    document.getElementById("pendingOrdersTable");

if(tableBody){

    tableBody.innerHTML = "";

    pendingOrders.forEach(order => {

        tableBody.innerHTML += `
            <tr>
                <td>#${order.orderNo}</td>
                <td>${order.customer}</td>
                <td>₱${order.total.toLocaleString()}</td>
                <td>
                    <span class="status pending">
                        Pending
                    </span>
                </td>
            </tr>
        `;

    });

}
// ===============================
// INVENTORY ALERTS
// ===============================

const inventoryCount = inventoryAlerts.length;

document.getElementById(
    "inventoryAlertCount"
).textContent = inventoryCount;

const inventoryTable =
    document.getElementById("inventoryAlertsTable");

if (inventoryTable) {

    inventoryTable.innerHTML = "";

    inventoryAlerts.forEach(item => {

        let alertClass = "pending";

        if(item.alert === "Low Stock"){
            alertClass = "danger";
        }

        if(item.alert === "Critical"){
            alertClass = "danger";
        }

        inventoryTable.innerHTML += `
            <tr>
                <td>${item.product}</td>
                <td>${item.stock}</td>
                <td>
                    <span class="status ${alertClass}">
                        ${item.alert}
                    </span>
                </td>
            </tr>
        `;
    });

}