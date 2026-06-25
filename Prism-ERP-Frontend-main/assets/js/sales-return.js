const API_URL = "http://localhost:5500/api/v1/returns";
const ORDERS_URL = "http://localhost:5500/api/v1/orders";

const modal = document.getElementById("returnModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const newReturnBtn = document.getElementById("newReturnBtn");
const addReturnBtn = document.getElementById("addReturnBtn");
const loadOrderBtn = document.getElementById("loadOrderBtn");
const salesOrderInput = document.getElementById("salesOrderId");
const reasonInput = document.getElementById("reason");
const returnItemsBody = document.getElementById("returnItemsBody");
const totalRefundEl = document.getElementById("totalRefund");

// Holds the currently loaded order's items so we can read quantities/prices
// back out when building the POST body, without re-parsing the DOM
let loadedOrderItems = [];

closeModalBtn.addEventListener("click", () => {
    resetModal();
    modal.classList.remove("show");
});

newReturnBtn.addEventListener("click", () => {
    modal.classList.add("show");
});

// Fetches the chosen order and renders one row per order item,
// each with a checkbox to include it and a number input for return qty
loadOrderBtn.addEventListener("click", async () => {
    const salesOrderId = salesOrderInput.value;

    if (!salesOrderId) {
        alert("Please enter a Sales Order ID first.");
        return;
    }

    try {
        const response = await fetch(`${ORDERS_URL}/${salesOrderId}`, {
            method: "GET"
        });

        if (!response.ok) {
            alert("Order not found.");
            return;
        }

        const order = await response.json();
        loadedOrderItems = order.items; // [{ order_item_id, product_name, quantity, unit_price, ... }]

        renderItemRows(loadedOrderItems);
    } catch (error) {
        console.error("Error loading order:", error);
        alert("Failed to load order.");
    }
});

// Renders the editable item table based on the loaded order's items
function renderItemRows(items) {
    returnItemsBody.innerHTML = "";

    items.forEach((item) => {
        const row = document.createElement("tr");
        row.dataset.orderItemId = item.order_item_id;
        row.dataset.unitPrice = item.unit_price;

        row.innerHTML = `
            <td><input type="checkbox" class="includeItem"></td>
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
            <td><input type="number" class="returnQty" min="0" max="${item.quantity}" value="0"></td>
            <td>₱${Number(item.unit_price).toFixed(2)}</td>
            <td class="subtotal">₱0.00</td>
        `;

        returnItemsBody.appendChild(row);
    });

    updateTotalRefund();
}

// Recalculates each row's subtotal and the running total refund
// whenever a quantity changes or a row is checked/unchecked
returnItemsBody.addEventListener("input", updateTotalRefund);
returnItemsBody.addEventListener("change", updateTotalRefund);

function updateTotalRefund() {
    let total = 0;

    document.querySelectorAll("#returnItemsBody tr").forEach((row) => {
        const checkbox = row.querySelector(".includeItem");
        const qtyInput = row.querySelector(".returnQty");
        const unitPrice = Number(row.dataset.unitPrice);
        const subtotalCell = row.querySelector(".subtotal");

        const qty = checkbox.checked ? Number(qtyInput.value) || 0 : 0;
        const subtotal = qty * unitPrice;

        subtotalCell.textContent = `₱${subtotal.toFixed(2)}`;
        total += subtotal;
    });

    totalRefundEl.textContent = `₱${total.toFixed(2)}`;
}

// Builds the POST body from only the checked rows and submits the return
addReturnBtn.addEventListener("click", async () => {
    const salesOrderId = salesOrderInput.value;
    const reason = reasonInput.value;

    if (!salesOrderId || !reason) {
        alert("Please fill in the Sales Order ID and Reason.");
        return;
    }

    const items = [];

    document.querySelectorAll("#returnItemsBody tr").forEach((row) => {
        const checkbox = row.querySelector(".includeItem");
        const qtyInput = row.querySelector(".returnQty");
        const qty = Number(qtyInput.value);

        if (checkbox.checked && qty > 0) {
            items.push({
                order_item_id: Number(row.dataset.orderItemId),
                quantity: qty
            });
        }
    });

    if (items.length === 0) {
        alert("Select at least one item with a return quantity.");
        return;
    }

    try {
        await addReturn(salesOrderId, reason, items);
        await loadReturns();
        resetModal();
        modal.style.display = "none";
    } catch (error) {
        console.error("Error adding return:", error);
        alert("Failed to create return.");
    }
});

// Clears all modal fields back to their initial state
function resetModal() {
    salesOrderInput.value = "";
    reasonInput.value = "";
    returnItemsBody.innerHTML = "";
    totalRefundEl.textContent = "₱0.00";
    loadedOrderItems = [];
}

window.addEventListener("DOMContentLoaded", async () => {
    await loadReturns();
});

// Loads the sales returns list and renders the table,
// fetching each return's item count individually for the "Items" column
async function loadReturns() {
    const response = await fetch(API_URL, { method: "GET" });
    const returns = await response.json();

    const tableBody = document.querySelector(".table-card tbody");
    tableBody.innerHTML = "";

    for (const salesReturn of returns) {
        const detailResponse = await fetch(`${API_URL}/${salesReturn.return_id}`, {
            method: "GET"
        });
        const returnData = await detailResponse.json();

        const refundAmount = Number(salesReturn.refund_amount);

        tableBody.innerHTML += `
            <tr>
                <td>${salesReturn.return_number}</td>
                <td>${formatDate(salesReturn.return_date)}</td>
                <td>${salesReturn.order_id}</td>
                <td>${salesReturn.reason}</td>
                <td>${returnData.items.length}</td>
                <td>₱${refundAmount.toLocaleString()}</td>
                <td>${salesReturn.status}</td>
            </tr>
        `;
    }
}

// Sends the POST request to create a new sales return
async function addReturn(salesOrderId, reason, items) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            order_id: Number(salesOrderId),
            reason: reason,
            items: items
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || "Request failed");
    }

    return await response.json();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}