const API_URL = "http://localhost:5500/api/v1/invoices"; // API endpoint for invoices



window.addEventListener('DOMContentLoaded', async () => {
    await loadInvoices(); // Load invoices data when the page is loaded
});



// function for loading invoices data from the API
async function loadInvoices() {
    const tableBody = document.querySelector(".table-card tbody");
    tableBody.innerHTML = "";
    
    const response = await fetch(API_URL, {
        method: 'GET'
    });
    const invoices = await response.json();

    Array.from(invoices).forEach(invoice => {
        tableBody.innerHTML += `
            <tr>
                <td>${invoice.invoice_id}</td>
                <td>${formatDate(invoice.issue_date)}</td>
                <td>${formatDate(invoice.due_date)}</td>
                <td>₱${invoice.amount.toLocaleString()}</td>
                <td>₱${invoice.paid.toLocaleString()}</td>
                <td>${invoice.status}</td>
                <td>
                    <i class="fas fa-eye action-icon"></i>
                    <i class="fas fa-print action-icon"></i>
                </td>
            </tr>
        `;
    });
}


// function for adding a new invoice
async function addInvoice() {

}


// function for searching invoices based on the search input
async function searchInvoices() {

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