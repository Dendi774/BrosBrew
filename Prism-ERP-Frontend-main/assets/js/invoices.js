const API_URL      = 'http://localhost:5500/api/v1/invoices';
const RECEIPTS_URL = 'http://localhost:5500/api/v1/receipts';

const fmt = (n) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Resolve the logged-in session → user_id. auth.js already stores user_id
// directly on the session object, so we just read it — no API round-trip needed.
function getLoggedInUserId() {
  const session = JSON.parse(sessionStorage.getItem('prismErpSession') || 'null');
  return session?.user_id ?? null;
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadInvoices();

  document.querySelector('.invoice-search')?.addEventListener('input', async (e) => {
    const term = e.target.value.trim();
    const url  = term ? `${API_URL}?search=${encodeURIComponent(term)}` : API_URL;
    const res  = await fetch(url);
    renderInvoices(await res.json());
  });

  // Invoices are auto-generated from orders — hide the manual "New Invoice" button
  const newBtn = document.querySelector('.btn-primary');
  if (newBtn) newBtn.style.display = 'none';
});

async function loadInvoices() {
  try {
    const res  = await fetch(API_URL);
    const data = await res.json();
    renderInvoices(data);
  } catch (err) {
    document.querySelector('.table-card tbody').innerHTML =
      `<tr><td colspan="8" style="text-align:center;color:#e74c3c">Error: ${err.message}</td></tr>`;
  }
}

function renderInvoices(invoices) {
  const tbody = document.querySelector('.table-card tbody');
  if (!invoices.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No invoices found</td></tr>';
    return;
  }

  tbody.innerHTML = invoices.map(inv => {
    const statusClass = { Paid:'success', Unpaid:'inactive', Partial:'warning', Overdue:'inactive' }[inv.status] || '';
    const balance = Number(inv.amount) - Number(inv.paid);
    const isCancelled = inv.order_status === 'Cancelled';

    const payBtn = (balance > 0 && !isCancelled)
      ? `<button class="secondary-btn" style="font-size:11px;padding:4px 10px"
            onclick="openPaymentModal('${inv.invoice_id}', ${balance.toFixed(2)})">
           <i class="fas fa-money-bill-wave"></i> Record Payment
         </button>`
      : (balance > 0 && isCancelled)
        ? `<span class="status inactive" style="font-size:11px" title="Order was cancelled — no further payments can be recorded">Order Cancelled</span>`
        : '';

    return `<tr>
      <td>${inv.invoice_id}</td>
      <td>${inv.order_id ? `Order #${inv.order_id}` : '—'}</td>
      <td>${formatDate(inv.issue_date)}</td>
      <td>${formatDate(inv.due_date)}</td>
      <td>${fmt(inv.amount)}</td>
      <td>${fmt(inv.paid)}</td>
      <td><span class="status ${statusClass}">${inv.status}</span></td>
      <td>${payBtn}</td>
    </tr>`;
  }).join('');
}

// ── Quick Payment Modal ────────────────────────────────────────────────────────
window.openPaymentModal = async (invoiceId, balance) => {
  const existing = document.getElementById('pay-modal');
  if (existing) existing.remove();

  // Get logged-in user's name for display
  const session  = JSON.parse(sessionStorage.getItem('prismErpSession') || 'null');
  const userName = session?.name || 'Unknown';

  const modal = document.createElement('div');
  modal.id = 'pay-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 32px;width:400px;max-width:95vw">
      <h3 style="margin:0 0 4px">Record Payment</h3>
      <p style="margin:0 0 20px;color:#666;font-size:13px">Invoice ${invoiceId} — Balance: <strong>${fmt(balance)}</strong></p>
      <div style="display:grid;gap:12px">
        <label>Amount (₱)
          <input id="pay-amount" type="number" step="0.01" max="${balance}" value="${Number(balance).toFixed(2)}"
            style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box">
        </label>
        <label>Method
          <select id="pay-method" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #ddd;border-radius:6px">
            <option>Cash</option><option>GCash</option><option>Bank Transfer</option><option>Credit Card</option>
          </select>
        </label>
        <div style="background:#f8f9fa;border-radius:6px;padding:10px 12px;font-size:13px;color:#555">
          <i class="fas fa-user" style="margin-right:6px"></i>
          Processed by: <strong>${userName}</strong>
        </div>
      </div>
      <p id="pay-err" style="color:#e74c3c;font-size:12px;margin:8px 0 0;min-height:16px"></p>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
        <button id="pay-cancel" style="padding:9px 20px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer">Cancel</button>
        <button id="pay-save"   style="padding:9px 20px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer">Save Receipt</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('pay-cancel').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  document.getElementById('pay-save').onclick = async () => {
    const amount  = parseFloat(document.getElementById('pay-amount').value);
    const method  = document.getElementById('pay-method').value;
    const errEl   = document.getElementById('pay-err');
    errEl.textContent = '';

    if (!amount || amount <= 0)         { errEl.textContent = 'Enter a valid amount'; return; }
    if (amount > Number(balance) + 0.01){ errEl.textContent = `Cannot exceed balance of ${fmt(balance)}`; return; }

    const userId = await getLoggedInUserId();

    try {
      const res = await fetch(RECEIPTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, amount, method, processed_by: userId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      modal.remove();
      await loadInvoices();
      alert(`Receipt ${result.receipt_number} recorded successfully.`);
    } catch (err) {
      errEl.textContent = err.message;
    }
  };
};

function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}
