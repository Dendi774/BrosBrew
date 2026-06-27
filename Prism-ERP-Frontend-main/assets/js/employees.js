const EMPLOYEES_URL = 'http://localhost:5500/api/v1/employees';

const modal         = document.getElementById('employeeModal');
const openAddBtn    = document.getElementById('openAddEmployeeBtn');
const closeModalBtn = document.getElementById('closeEmployeeModalBtn');
const saveBtn       = document.getElementById('saveEmployeeBtn');

let _employeesCache = [];

window.addEventListener('DOMContentLoaded', () => {
  loadEmployees();

  document.getElementById('employee-search')?.addEventListener('input', applyFilters);
  document.getElementById('status-filter')?.addEventListener('change', applyFilters);
  // NOTE: "Department" isn't a column in the employees table (see schema —
  // only position, salary, status, hire_date, user_id), so this filter is
  // left in place visually but doesn't do anything yet. Add a department
  // column to the schema first if you want it to actually filter.
});

openAddBtn.addEventListener('click', () => {
  resetForm();
  modal.classList.add('show');
});

closeModalBtn.addEventListener('click', () => {
  modal.classList.remove('show');
});

saveBtn.addEventListener('click', saveEmployee);

// ── Load & render ────────────────────────────────────────────────────────────
async function loadEmployees() {
  const tbody = document.querySelector('.table-card tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading…</td></tr>';
  try {
    const res  = await fetch(EMPLOYEES_URL);
    const data = await res.json();
    _employeesCache = data;

    document.querySelector('.page-header p').textContent =
      `${data.length} employee${data.length !== 1 ? 's' : ''}`;

    renderRows(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#e74c3c">Error: ${err.message}</td></tr>`;
  }
}

function renderRows(employees) {
  const tbody = document.querySelector('.table-card tbody');

  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No employees found</td></tr>';
    return;
  }

  tbody.innerHTML = employees.map(emp => {
    const empCode      = `EMP-${String(emp.employee_id).padStart(3, '0')}`;
    const fullName     = `${emp.first_name} ${emp.last_name}`;
    const hireDate      = emp.hire_date
      ? new Date(emp.hire_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';
    const statusClass  = emp.status === 'active' ? 'success' : 'inactive';
    const mailIcon      = emp.email
      ? `<a href="mailto:${emp.email}"><i class="fas fa-envelope"></i></a>`
      : `<i class="fas fa-envelope" style="opacity:.3"></i>`;

    return `
      <tr>
        <td>${empCode}</td>
        <td>${fullName}</td>
        <td>${emp.position ?? '—'}</td>
        <td>—</td>
        <td>${hireDate}</td>
        <td>${mailIcon}</td>
        <td><span class="status ${statusClass}">${emp.status.toUpperCase()}</span></td>
      </tr>`;
  }).join('');
}

function applyFilters() {
  const term         = (document.getElementById('employee-search').value || '').toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;

  const filtered = _employeesCache.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch = !term || fullName.includes(term) || (emp.position ?? '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'All Status' || emp.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  renderRows(filtered);
}

// ── Add Employee modal ───────────────────────────────────────────────────────

function resetForm() {
  document.getElementById('employee-first-name').value = '';
  document.getElementById('employee-last-name').value = '';
  document.getElementById('employee-position').value = '';
  document.getElementById('employee-salary').value = '';
  document.getElementById('employee-hire-date').value = '';
  document.getElementById('employee-status').value = 'active';
  document.getElementById('employee-username').value = '';
  document.getElementById('employee-email').value = '';
  document.getElementById('employee-password').value = '';
}

async function saveEmployee() {
  const payload = {
    first_name: document.getElementById('employee-first-name').value.trim(),
    last_name:  document.getElementById('employee-last-name').value.trim(),
    position:   document.getElementById('employee-position').value.trim() || null,
    salary:     parseFloat(document.getElementById('employee-salary').value) || null,
    hire_date:  document.getElementById('employee-hire-date').value || null,
    status:     document.getElementById('employee-status').value,
    username:   document.getElementById('employee-username').value.trim(),
    email:      document.getElementById('employee-email').value.trim(),
    password:   document.getElementById('employee-password').value.trim(),
  };

  if (!payload.first_name || !payload.last_name) {
    alert('First and last name are required.');
    return;
  }
  if (!payload.username || !payload.email) {
    alert('Username and email are required — a login account is created for every employee.');
    return;
  }
  if (!payload.password) {
    alert('A password is required to create the login account for this employee.');
    return;
  }

  try {
    const res = await fetch(EMPLOYEES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Request failed');
    }

    modal.classList.remove('show');
    await loadEmployees();
  } catch (err) {
    console.error('Failed to save employee:', err);
    alert(err.message || 'Failed to save employee. Please check the form and try again.');
  }
}
