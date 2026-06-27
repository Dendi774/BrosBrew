// Receipts page is VIEW-ONLY. Receipts are created from the Invoices page
// ("Record Payment"), which calls POST /api/v1/receipts itself — this page
// only lists/searches the receipts that already exist and lets you print one.

const API_URL = 'http://localhost:5500/api/v1/receipts';

const fmt = (n) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Load receipts table ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadReceipts();

  document.querySelector('.invoice-search')?.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.table-card tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });
});

// Cache of the currently loaded receipts, so printReceipt() can look one up
// by receipt_number without firing another API call.
let _receiptsCache = [];

async function loadReceipts() {
  const tbody = document.querySelector('.table-card tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading…</td></tr>';
  try {
    const res      = await fetch(API_URL);
    const receipts = await res.json();
    _receiptsCache = receipts;

    if (!receipts.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No receipts yet</td></tr>';
      return;
    }

    tbody.innerHTML = receipts.map(r => `
      <tr>
        <td>${r.receipt_number}</td>
        <td>${formatDate(r.receipt_date)}</td>
        <td>${r.invoice_id}</td>
        <td>${r.method}</td>
        <td>${fmt(r.amount)}</td>
        <td>${r.processed_by_name || '—'}</td>
        <td>
          <button class="icon-btn" title="Print" onclick="printReceipt('${r.receipt_number}')">
            <i class="fas fa-print"></i>
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#e74c3c">Error: ${err.message}</td></tr>`;
  }
}

// Opens a small printable slip for the given receipt in a new window.
window.printReceipt = (receiptNumber) => {
  const r = _receiptsCache.find(x => x.receipt_number === receiptNumber);
  if (!r) { alert('Receipt not found.'); return; }

  const win = window.open('', '_blank', 'width=380,height=600');
  win.document.write(`
    <html>
      <head>
        <title>${r.receipt_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          h2 { margin: 0 0 4px; }
          .muted { color: #777; font-size: 12px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          td { padding: 6px 0; }
          td:first-child { color: #777; }
          td:last-child { text-align: right; font-weight: 600; }
          hr { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
          .total { font-size: 18px; }
        </style>
      </head>
      <body>
        <h2>BrosBrew Café</h2>
        <p class="muted">Official Receipt</p>
        <hr>
        <table>
          <tr><td>Receipt #</td><td>${r.receipt_number}</td></tr>
          <tr><td>Date</td><td>${formatDate(r.receipt_date)}</td></tr>
          <tr><td>Invoice Ref</td><td>${r.invoice_id}</td></tr>
          <tr><td>Method</td><td>${r.method}</td></tr>
          <tr><td>Processed By</td><td>${r.processed_by_name || '—'}</td></tr>
        </table>
        <hr>
        <table>
          <tr class="total"><td>Amount Paid</td><td>${fmt(r.amount)}</td></tr>
        </table>
        <hr>
        <p class="muted" style="text-align:center">Thank you for your purchase!</p>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};

function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
