const API_URL    = 'http://localhost:5500/api/v1/returns';
const ORDERS_URL = 'http://localhost:5500/api/v1/orders';

const modal          = document.getElementById('returnModal');
const closeModalBtn  = document.getElementById('closeModalBtn');
const newReturnBtn   = document.getElementById('newReturnBtn');
const addReturnBtn   = document.getElementById('addReturnBtn');
const loadOrderBtn   = document.getElementById('loadOrderBtn');
const salesOrderInput = document.getElementById('salesOrderId');
const reasonInput    = document.getElementById('reason');
const returnItemsBody = document.getElementById('returnItemsBody');
const totalRefundEl  = document.getElementById('totalRefund');

let loadedOrderItems = [];

// ── Modal open/close ───────────────────────────────────────────────────────────
newReturnBtn.addEventListener('click', () => modal.classList.add('show'));
closeModalBtn.addEventListener('click', () => { resetModal(); modal.classList.remove('show'); });
modal.addEventListener('click', e => { if (e.target === modal) { resetModal(); modal.classList.remove('show'); } });

// ── Load order items into the return form ──────────────────────────────────────
loadOrderBtn.addEventListener('click', async () => {
  const orderId = salesOrderInput.value.trim();
  if (!orderId) { alert('Please enter a Sales Order ID first.'); return; }

  try {
    const res = await fetch(`${ORDERS_URL}/${orderId}`);
    if (!res.ok) { alert('Order not found.'); return; }
    const order = await res.json();

    if (order.status !== 'Completed') {
      alert(`Only Completed orders can be returned. This order is "${order.status}".`);
      return;
    }

    loadedOrderItems = order.items;
    renderItemRows(loadedOrderItems);
  } catch (err) {
    alert('Failed to load order: ' + err.message);
  }
});

function renderItemRows(items) {
  returnItemsBody.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('tr');
    row.dataset.orderItemId = item.order_item_id;
    row.dataset.unitPrice   = item.unit_price;
    row.innerHTML = `
      <td><input type="checkbox" class="includeItem"></td>
      <td>${item.product_name}</td>
      <td>${item.quantity}</td>
      <td><input type="number" class="returnQty" min="0" max="${item.quantity}" value="0"
            style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px"></td>
      <td>₱${Number(item.unit_price).toFixed(2)}</td>
      <td class="subtotal">₱0.00</td>`;
    returnItemsBody.appendChild(row);
  });
  updateTotalRefund();
}

returnItemsBody.addEventListener('input',  updateTotalRefund);
returnItemsBody.addEventListener('change', updateTotalRefund);

function updateTotalRefund() {
  let total = 0;
  document.querySelectorAll('#returnItemsBody tr').forEach(row => {
    const checkbox    = row.querySelector('.includeItem');
    const qtyInput    = row.querySelector('.returnQty');
    const unitPrice   = Number(row.dataset.unitPrice);
    const subtotalCell = row.querySelector('.subtotal');
    const qty         = checkbox?.checked ? Number(qtyInput?.value) || 0 : 0;
    const subtotal    = qty * unitPrice;
    subtotalCell.textContent = `₱${subtotal.toFixed(2)}`;
    total += subtotal;
  });
  totalRefundEl.textContent = `₱${total.toFixed(2)}`;
}

// ── Submit new return ──────────────────────────────────────────────────────────
addReturnBtn.addEventListener('click', async () => {
  const orderId = salesOrderInput.value.trim();
  const reason  = reasonInput.value.trim();

  if (!orderId || !reason) { alert('Please fill in the Sales Order ID and Reason.'); return; }

  const items = [];
  document.querySelectorAll('#returnItemsBody tr').forEach(row => {
    const checkbox = row.querySelector('.includeItem');
    const qty      = Number(row.querySelector('.returnQty')?.value || 0);
    if (checkbox?.checked && qty > 0) {
      items.push({ order_item_id: Number(row.dataset.orderItemId), quantity: qty });
    }
  });

  if (items.length === 0) { alert('Select at least one item with a return quantity.'); return; }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: Number(orderId), reason, items }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    resetModal();
    modal.classList.remove('show');
    await loadReturns();
  } catch (err) {
    alert('Failed to create return: ' + err.message);
  }
});

function resetModal() {
  salesOrderInput.value   = '';
  reasonInput.value       = '';
  returnItemsBody.innerHTML = '';
  totalRefundEl.textContent = '₱0.00';
  loadedOrderItems = [];
}

// ── Load returns table ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', loadReturns);

async function loadReturns() {
  const tbody = document.querySelector('.table-card tbody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">Loading…</td></tr>';

  try {
    const res     = await fetch(API_URL);
    const returns = await res.json();

    if (!returns.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No returns yet</td></tr>';
      return;
    }

    // Fetch detail for each return to get item count (parallelised)
    const details = await Promise.all(
      returns.map(r => fetch(`${API_URL}/${r.return_id}`).then(res => res.json()))
    );

    tbody.innerHTML = returns.map((r, i) => {
      const detail      = details[i];
      const itemCount   = detail?.items?.length ?? '—';
      const statusClass = {
        Pending:    'warning',
        Processing: 'warning',
        Approved:   'success',
        Refunded:   'success',
        Rejected:   'inactive',
      }[r.status] || '';

      // Approve / Reject only shown for Pending or Processing returns
      const canAct = ['Pending', 'Processing'].includes(r.status);
      const actions = canAct
        ? `<button class="secondary-btn" style="font-size:11px;padding:3px 10px;margin-right:4px"
                onclick="updateReturnStatus(${r.return_id}, 'Approved')">
             <i class="fas fa-check"></i> Approve
           </button>
           <button class="secondary-btn" style="font-size:11px;padding:3px 10px;background:#fff;color:#e74c3c;border:1px solid #e74c3c"
                onclick="updateReturnStatus(${r.return_id}, 'Rejected')">
             <i class="fas fa-times"></i> Reject
           </button>`
        : `<span style="font-size:12px;color:#9ca3af">${r.status}</span>`;

      return `<tr>
        <td>${r.return_number}</td>
        <td>${formatDate(r.return_date)}</td>
        <td>Order #${r.order_id}</td>
        <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.reason || ''}">${r.reason || '—'}</td>
        <td>${itemCount}</td>
        <td>₱${Number(r.refund_amount).toLocaleString('en-PH', {minimumFractionDigits:2})}</td>
        <td><span class="status ${statusClass}">${r.status}</span></td>
        <td style="white-space:nowrap">${actions}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#e74c3c">${err.message}</td></tr>`;
  }
}

// ── Approve / Reject ───────────────────────────────────────────────────────────
window.updateReturnStatus = async (returnId, status) => {
  const label = status === 'Approved' ? 'approve' : 'reject';
  if (!confirm(`Are you sure you want to ${label} Return #${returnId}?`)) return;

  try {
    const res = await fetch(`${API_URL}/${returnId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    await loadReturns();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}
