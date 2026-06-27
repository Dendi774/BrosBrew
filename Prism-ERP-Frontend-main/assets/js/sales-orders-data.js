const API_URL = 'http://localhost:5500/api/v1/orders';

const modal        = document.getElementById('orderModal');
const closeModalBtn = document.getElementById('closeModalBtn');

// ── Modal open/close ───────────────────────────────────────────────────────────
document.getElementById('createOrderBtn').onclick = () => modal.classList.add('show');
closeModalBtn.onclick = () => {
  modal.classList.remove('show');
  resetModal();
};

// ── Add extra product row ──────────────────────────────────────────────────────
document.getElementById('addItemBtn').onclick = () => {
  document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', `
    <div class="item-row">
      <select class="productId">
        <option value="">-- Product --</option>
      </select>
      <input type="number" class="quantity" placeholder="Qty" min="1">
      <button type="button" class="icon-btn remove-row-btn" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `);
  populateProductSelects();
  document.getElementById('itemsContainer').addEventListener('click', handleRemoveRow);
};

function handleRemoveRow(e) {
  const btn = e.target.closest('.remove-row-btn');
  if (btn) btn.closest('.item-row').remove();
}

// ── Populate product dropdowns ─────────────────────────────────────────────────
async function populateProductSelects() {
  try {
    const res  = await fetch('http://localhost:3000/api/v1/products');
    const prods = await res.json();
    const selects = document.querySelectorAll('#itemsContainer .productId');
    selects.forEach(sel => {
      const current = sel.value;
      sel.innerHTML = '<option value="">-- Product --</option>' +
        prods
          .filter(p => p.status === 'ACTIVE')
          .map(p => `<option value="${p.product_id}" ${p.product_id == current ? 'selected' : ''}>
                       ${p.product_name} — ₱${Number(p.price).toFixed(2)}
                     </option>`)
          .join('');
    });
  } catch { /* fail silently — IDs still work */ }
}

// ── Submit order ───────────────────────────────────────────────────────────────
document.getElementById('submitOrderBtn').onclick = async () => {
  const payment = document.getElementById('paymentMethod').value;
  const rows    = document.querySelectorAll('#itemsContainer .item-row');

  const items = [];
  rows.forEach(row => {
    const product_id = Number(row.querySelector('.productId').value);
    const quantity   = Number(row.querySelector('.quantity').value);
    if (product_id && quantity > 0) items.push({ product_id, quantity });
  });

  if (items.length === 0) { alert('Add at least one product'); return; }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode_of_payment: payment, items }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    modal.classList.remove('show');
    resetModal();
    await loadOrderTable();
  } catch (err) {
    alert('Error creating order: ' + err.message);
  }
};

// ── Load order table ───────────────────────────────────────────────────────────
async function loadOrderTable() {
  const tbody = document.querySelector('.table-card tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading…</td></tr>';

  try {
    const res  = await fetch(API_URL);
    const data = await res.json();

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No orders yet</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(order => {
      const statusLower = order.status.toLowerCase();
      // "Mark as Completed" appears only on Preparing orders
      const completeBtn = order.status === 'Preparing'
        ? `<button class="secondary-btn" style="font-size:11px;padding:4px 10px"
              onclick="markComplete(${order.order_id})">
             <i class="fas fa-check"></i> Mark Complete
           </button>`
        : '';
      // Cancel button for Pending or Preparing
      const cancelBtn = ['Pending','Preparing'].includes(order.status)
        ? `<button class="icon-btn" style="color:#e74c3c" title="Cancel Order"
              onclick="cancelOrder(${order.order_id})">
             <i class="fas fa-ban"></i>
           </button>`
        : '';

      return `<tr>
        <td>${order.order_id}</td>
        <td>${order.invoice_id}</td>
        <td>${formatDate(order.order_date)}</td>
        <td>₱${Number(order.total_amount).toLocaleString('en-PH', {minimumFractionDigits:2})}</td>
        <td><span class="status ${statusLower}">${order.status}</span></td>
        <td style="white-space:nowrap">${completeBtn} ${cancelBtn}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#e74c3c">${err.message}</td></tr>`;
  }
}

// ── Actions ────────────────────────────────────────────────────────────────────
window.markComplete = async (orderId) => {
  if (!confirm(`Mark Order #${orderId} as Completed?`)) return;
  try {
    const res = await fetch(`${API_URL}/${orderId}/complete`, { method: 'PATCH' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    await loadOrderTable();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.cancelOrder = async (orderId) => {
  if (!confirm(`Cancel Order #${orderId}? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API_URL}/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Cancelled' }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    await loadOrderTable();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

function resetModal() {
  document.getElementById('itemsContainer').innerHTML = `
    <div class="item-row">
      <select class="productId"><option value="">-- Product --</option></select>
      <input type="number" class="quantity" placeholder="Qty" min="1">
    </div>`;
  document.getElementById('paymentMethod').value = 'Cash';
  populateProductSelects();
}

function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

// ── Init ───────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadOrderTable();
  await populateProductSelects();
});
