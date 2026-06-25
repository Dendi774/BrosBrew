const API_URL = "http://localhost:5500/api/v1/receipts"; // API endpoint for receipts
const newReceiptBtn = document.getElementById("new-receipt-btn"); // Button to create a new receipt
const modal = document.getElementById("receiptModal");
const addReceiptBtn = document.getElementById("addReceiptBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

// Event listener to close the modal when the close button is clicked
closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("show"); // Hide the modal
});

newReceiptBtn.addEventListener("click", () => {
    modal.classList.add("show"); // Show the modal for creating a new receipt
});

addReceiptBtn.addEventListener("click", async () => {
    await addReceipt(); // Call the function to add a new receipt
});

// loads the receipts data when the page is loaded
window.addEventListener('DOMContentLoaded', async () => {
    await loadReceipts();
});


// function for loading receipts data from the API
async function loadReceipts() {
    const response = await fetch(API_URL);
    const receipts = await response.json();
    
    console.log(receipts); // Log the receipts data to the console for debugging

    const tableBody = document.querySelector(".table-card tbody");
    tableBody.innerHTML = "";

    Array.from(receipts).forEach(async (receipt) => {
        const processedBy = await getUserById(receipt.processed_by); // Get the username of the user who processed the receipt
        tableBody.innerHTML += `
            <tr>
                <td>${receipt.receipt_number}</td>
                <td>${formatDate(receipt.receipt_date)}</td>
                <td>${receipt.invoice_id}</td>
                <td>${receipt.method}</td>
                <td>₱${receipt.amount.toLocaleString()}</td>
                <td>${processedBy}</td>
                <td>
                    <i class="fas fa-eye action-icon" onclick="viewReceipt('${receipt.receipt_number}')"></i>
                    <i class="fas fa-print action-icon" onclick="printReceipt('${receipt.receipt_number}')"></i>
                </td>
            </tr>
        `;
    });
}


// function for printing a receipt and viewing the receipt details
function viewReceipt(receiptNumber) {
    // Implement the logic to view the receipt details
    console.log(`Viewing receipt: ${receiptNumber}`);
}


// function for adding a new receipt from the API
async function addReceipt() {
    const receiptDetails = {
        invoice_id: document.getElementById("invoice-id").value,
        method: document.getElementById("method").value,
        amount: parseFloat(document.getElementById("amount").value),
        processed_by: await getUserId(document.getElementById("processed-by").value)
    }

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(receiptDetails)
    });

    const result = await response.json();

    console.log(result); // Log the result of adding the receipt for debugging
    await loadReceipts(); // Reload the receipts data to reflect the new addition
    modal.style.display = "none"; // Hide the modal after adding the receipt
}


// function for searching receipts from the API
async function seachReceipts() {
    
}


// helper function to format date
function formatDate(dateString) {

    const formattedDate = new Date(dateString).toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

    return formattedDate;
}

async function getUserId(username) {
    const response = await fetch(`http://localhost:5500/api/v1/users`);
    const users = await response.json();
    const user = users.find(u => u.username === username);
    console.log(user);
    return user ? user.user_id : null;
}

// function to get the specific user the receipt was processed by
async function getUserById(userId) {
    const response = await fetch(`http://localhost:5500/api/v1/users/${userId}`);
    const user = await response.json();
    return user.username; // Assuming the API returns a user object with a username property
}