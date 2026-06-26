/* ============================================================
   Prism-ERP — Attendance Management
   ============================================================
   Powers: time-in.html, time-out.html, records.html,
           leave-request.html

   Employees only ever see/act on their own record (the backend
   also enforces this — see middleware/auth.js). Managers/admins
   see every employee's records on records.html and approve/
   reject leave requests.
   ============================================================ */

function fmtTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtHours(value) {
    if (value === null || value === undefined) return "—";
    const hrs = Math.floor(value);
    const mins = Math.round((value - hrs) * 60);
    return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

function statusBadge(status) {
    const map = {
        "Time In": "warning",
        "Completed": "success",
        "pending": "warning",
        "approved": "success",
        "rejected": "danger"
    };
    const cls = map[status] || "processing";
    return `<span class="status ${cls}">${(status || "").toString().toUpperCase()}</span>`;
}

function showFeedback(elId, message, isError) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
    el.style.color = isError ? "#dc2626" : "#16a34a";
}

/* ---------------- Time In page ---------------- */

async function initTimeInPage(session) {
    const btn = document.getElementById("recordTimeInBtn");
    const statusBox = document.getElementById("currentStatusBox");

    async function refreshStatus() {
        try {
            const { open } = await apiFetch("/attendance/me/status");
            if (open) {
                statusBox.innerHTML = `You timed in at <strong>${fmtTime(open.time_in)}</strong> and haven't timed out yet.`;
                btn.disabled = true;
                btn.textContent = "Already Timed In";
            } else {
                statusBox.innerHTML = "You haven't timed in today.";
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Record Time In';
            }
        } catch (err) {
            showFeedback("attendanceFeedback", err.message, true);
        }
    }

    async function loadHistory() {
        const data = await apiFetch(`/attendance/employee/${session.employee_id}`);
        const tbody = document.getElementById("attendanceTableBody");
        if (!tbody) return;
        tbody.innerHTML = data.map(row => `
            <tr>
                <td>ATT-${String(row.attendance_id).padStart(5, "0")}</td>
                <td>${fmtDate(row.time_in)}</td>
                <td>${fmtTime(row.time_in)}</td>
                <td>${fmtTime(row.time_out)}</td>
                <td>${fmtHours(row.hours_worked)}</td>
                <td>${statusBadge(row.status)}</td>
            </tr>
        `).join("") || `<tr><td colspan="6">No attendance records yet.</td></tr>`;
    }

    btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
            await apiFetch("/attendance/time-in", { method: "POST" });
            showFeedback("attendanceFeedback", "Time In recorded successfully.", false);
            await refreshStatus();
            await loadHistory();
        } catch (err) {
            showFeedback("attendanceFeedback", err.message, true);
            btn.disabled = false;
        }
    });

    await refreshStatus();
    await loadHistory();
}

/* ---------------- Time Out page ---------------- */

async function initTimeOutPage(session) {
    const btn = document.getElementById("recordTimeOutBtn");
    const statusBox = document.getElementById("currentStatusBox");

    async function refreshStatus() {
        try {
            const { open } = await apiFetch("/attendance/me/status");
            if (open) {
                statusBox.innerHTML = `You timed in at <strong>${fmtTime(open.time_in)}</strong>. Ready to time out.`;
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-right-from-bracket"></i> Record Time Out';
            } else {
                statusBox.innerHTML = "You don't have an active Time In. Please Time In first.";
                btn.disabled = true;
                btn.textContent = "No Active Time In";
            }
        } catch (err) {
            showFeedback("attendanceFeedback", err.message, true);
        }
    }

    async function loadHistory() {
        const data = await apiFetch(`/attendance/employee/${session.employee_id}`);
        const tbody = document.getElementById("attendanceTableBody");
        if (!tbody) return;
        tbody.innerHTML = data.map(row => `
            <tr>
                <td>ATT-${String(row.attendance_id).padStart(5, "0")}</td>
                <td>${fmtDate(row.time_in)}</td>
                <td>${fmtTime(row.time_in)}</td>
                <td>${fmtTime(row.time_out)}</td>
                <td>${fmtHours(row.hours_worked)}</td>
                <td>${statusBadge(row.status)}</td>
            </tr>
        `).join("") || `<tr><td colspan="6">No attendance records yet.</td></tr>`;
    }

    btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
            await apiFetch("/attendance/time-out", { method: "PUT" });
            showFeedback("attendanceFeedback", "Time Out recorded successfully.", false);
            await refreshStatus();
            await loadHistory();
        } catch (err) {
            showFeedback("attendanceFeedback", err.message, true);
            btn.disabled = false;
        }
    });

    await refreshStatus();
    await loadHistory();
}

/* ---------------- Records page ----------------
   Managers/admins see everyone; employees are routed here only
   to view their own history (the backend would reject a request
   for someone else's employee_id anyway). */

async function initRecordsPage(session) {
    const isManager = session.role === "manager" || session.role === "admin";
    const tbody = document.getElementById("attendanceTableBody");
    const titleEl = document.getElementById("recordsTitle");

    if (titleEl) {
        titleEl.textContent = isManager ? "All Employees — Attendance Records" : "My Attendance Records";
    }

    try {
        const data = isManager
            ? await apiFetch("/attendance")
            : await apiFetch(`/attendance/employee/${session.employee_id}`);

        tbody.innerHTML = data.map(row => `
            <tr>
                <td>${fmtDate(row.time_in)}</td>
                <td>EMP-${String(row.employee_id).padStart(3, "0")}</td>
                <td>${row.first_name || ""} ${row.last_name || ""}</td>
                <td>${fmtTime(row.time_in)}</td>
                <td>${fmtTime(row.time_out)}</td>
                <td>${fmtHours(row.hours_worked)}</td>
                <td>${statusBadge(row.status)}</td>
            </tr>
        `).join("") || `<tr><td colspan="7">No attendance records found.</td></tr>`;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">${err.message}</td></tr>`;
    }
}

/* ---------------- Leave Request page ---------------- */

async function initLeaveRequestPage(session) {
    const isManager = session.role === "manager" || session.role === "admin";
    const tbody = document.getElementById("leaveTableBody");
    const titleEl = document.getElementById("leaveListTitle");
    const form = document.getElementById("leaveRequestForm");
    const modal = document.getElementById("leaveModal");
    const openBtn = document.getElementById("fileLeaveBtn");
    const closeBtn = document.getElementById("closeLeaveModalBtn");

    if (titleEl) {
        titleEl.textContent = isManager ? "All Leave Requests" : "My Leave Requests";
    }

    if (openBtn && modal) {
        openBtn.addEventListener("click", () => modal.classList.add("show"));
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => modal.classList.remove("show"));
    }

    async function loadLeaves() {
        try {
            const data = isManager
                ? await apiFetch("/leaves")
                : await apiFetch(`/leaves/employee/${session.employee_id}`);

            tbody.innerHTML = data.map(row => `
                <tr>
                    <td>LR-${String(row.leave_id).padStart(4, "0")}</td>
                    ${isManager ? `<td>${row.first_name || ""} ${row.last_name || ""}</td>` : ""}
                    <td>${row.leave_type}</td>
                    <td>${fmtDate(row.start_date)}</td>
                    <td>${fmtDate(row.end_date)}</td>
                    <td>${row.reason || "—"}</td>
                    <td>${statusBadge(row.status)}</td>
                    ${isManager ? `<td>
                        ${row.status === "pending" ? `
                            <button class="secondary-btn approve-btn" data-id="${row.leave_id}">Approve</button>
                            <button class="secondary-btn reject-btn" data-id="${row.leave_id}">Reject</button>
                        ` : "—"}
                    </td>` : ""}
                </tr>
            `).join("") || `<tr><td colspan="${isManager ? 8 : 6}">No leave requests found.</td></tr>`;

            if (isManager) {
                tbody.querySelectorAll(".approve-btn").forEach(b => b.addEventListener("click", () => updateStatus(b.dataset.id, "approved")));
                tbody.querySelectorAll(".reject-btn").forEach(b => b.addEventListener("click", () => updateStatus(b.dataset.id, "rejected")));
            }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8">${err.message}</td></tr>`;
        }
    }

    async function updateStatus(id, status) {
        try {
            await apiFetch(`/leaves/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });
            await loadLeaves();
        } catch (err) {
            alert(err.message);
        }
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                await apiFetch("/leaves", {
                    method: "POST",
                    body: JSON.stringify({
                        employee_id: session.employee_id,
                        leave_type: document.getElementById("leaveType").value,
                        reason: document.getElementById("leaveReason").value,
                        start_date: document.getElementById("leaveStart").value,
                        end_date: document.getElementById("leaveEnd").value
                    })
                });
                modal.classList.remove("show");
                form.reset();
                await loadLeaves();
            } catch (err) {
                showFeedback("leaveFeedback", err.message, true);
            }
        });
    }

    await loadLeaves();
}
