/* ============================================================
   Prism-ERP — Auth & Role Access Control
   ============================================================
   Demo-only authentication (no backend). Credentials and roles
   are defined in DEMO_USERS below. Swap this out for a real
   API call when you have a backend ready.
   ============================================================ */

const AUTH_STORAGE_KEY = "prismErpSession";
const API_BASE_URL = "http://localhost:5500/api/v1";

// Map of employee_id by user_id, populated by login() after the backend
// confirms credentials, so attendance/leave records can still be scoped
// correctly for users who also have an employees row.

// Which sidebar modules each role is allowed to see.
// Module names correspond to data-module attributes in the sidebar markup.
const ROLE_ACCESS = {
    manager: ["dashboard", "sales", "inventory", "employees", "attendance", "payroll"],
    employee: ["dashboard", "sales", "attendance", "payroll"]
};

/* ---------------- Session helpers ---------------- */

function getSession() {
    try {
        const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setSession(session) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

async function login(username, password) {
    const identifier = (username || "").trim();

    if (!identifier || !password) {
        return { ok: false, message: "Please enter a username/email and password." };
    }

    let user;
    try {
        const res = await fetch(API_BASE_URL + "/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: identifier, password })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { ok: false, message: data.message || "Invalid username or password." };
        }

        user = await res.json();
    } catch (e) {
        return { ok: false, message: "Couldn't reach the server. Please try again." };
    }

    // If this account also has a linked employees row, pull that record so
    // attendance/leave/payroll pages can scope data by employee_id.
    let employee = null;
    try {
        const employees = await (await fetch(API_BASE_URL + "/employees")).json();
        employee = Array.isArray(employees)
            ? employees.find((e) => e.user_id === user.user_id)
            : null;
    } catch (e) {
        // Non-fatal — proceed without an employee record (e.g. admins/managers
        // without an employees row, or the employees endpoint being unreachable).
    }

    const displayName = employee
        ? `${employee.first_name} ${employee.last_name}`
        : user.username;

    setSession({
        username: user.username,
        email: user.email,
        role: user.role,
        name: displayName,
        title: employee ? employee.position : capitalize(user.role),
        initials: getInitials(displayName),
        user_id: user.user_id,
        employee_id: employee ? employee.employee_id : null,
        loginAt: Date.now()
    });

    return { ok: true };
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function getInitials(name) {
    return (name || "")
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0].toUpperCase())
        .slice(0, 2)
        .join("");
}

/* ---------------- API helper ----------------
   Wraps fetch() so every request to the backend automatically
   carries the signed-in user's identity. The backend uses these
   headers (see middleware/auth.js) to scope/own attendance and
   leave-request data to the correct account. */

async function apiFetch(path, options = {}) {
    const session = getSession();
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (session) {
        if (session.user_id) headers["x-user-id"] = session.user_id;
        if (session.employee_id) headers["x-employee-id"] = session.employee_id;
        if (session.role) headers["x-role"] = session.role;
    }

    const res = await fetch(API_BASE_URL + path, { ...options, headers });
    let data = null;
    try {
        data = await res.json();
    } catch (e) {
        // no JSON body
    }

    if (!res.ok) {
        const message = (data && data.message) || `Request failed (${res.status})`;
        throw new Error(message);
    }

    return data;
}

function logout() {
    clearSession();
    window.location.href = getBasePath() + "login.html";
}

/* ---------------- Path helpers ----------------
   Pages live at different depths (./index.html vs
   ./pages/sales/sales-orders.html), so we compute how many
   "../" segments are needed to get back to the project root. */

function getBasePath() {
    const path = window.location.pathname;
    const depth = (path.split("/pages/")[1] || "").split("/").filter(Boolean).length;
    return "../".repeat(depth);
}

/* ---------------- Page guard ----------------
   Call this at the top of every protected page (including
   index.html). Redirects to login if not authenticated, and
   blocks the page entirely if the role lacks access to the
   current module. */

function requireAuth(currentModule) {
    const session = getSession();

    if (!session) {
        window.location.href = getBasePath() + "login.html";
        return null;
    }

    const allowed = ROLE_ACCESS[session.role] || [];

    if (currentModule && !allowed.includes(currentModule)) {
        // Logged in, but this role isn't permitted on this page.
        renderAccessDenied(session);
        return session;
    }

    return session;
}

function renderAccessDenied(session) {
    document.body.innerHTML = `
        <div style="
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            height:100vh;font-family:'Poppins',sans-serif;text-align:center;background:#f4f6f9;color:#2b2f38;
        ">
            <i class="fas fa-lock" style="font-size:48px;color:#e23a3a;margin-bottom:16px;"></i>
            <h2 style="margin:0 0 8px;">Access Restricted</h2>
            <p style="margin:0 0 24px;color:#6b7280;max-width:360px;">
                Your account (<strong>${session.role}</strong>) doesn't have permission to view this page.
            </p>
            <a href="${getBasePath()}index.html" style="
                background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;
                text-decoration:none;font-weight:500;
            ">Back to Dashboard</a>
        </div>
    `;
}

/* ---------------- Sidebar filtering ----------------
   Hides any sidebar <li> (links and menu-title headers) whose
   data-module isn't allowed for the current role, then injects
   the logged-in user's name/title/initials and wires up logout. */

function applySidebarAccess(session) {
    if (!session) return;

    const allowed = ROLE_ACCESS[session.role] || [];

    document.querySelectorAll("[data-module]").forEach(el => {
        const mod = el.getAttribute("data-module");
        if (!allowed.includes(mod)) {
            el.style.display = "none";
        }
    });

    // Update profile block in sidebar footer, if present
    const avatar = document.querySelector(".user-profile .avatar");
    const nameEl = document.querySelector(".user-profile .user-info h4");
    const titleEl = document.querySelector(".user-profile .user-info p");
    if (avatar) avatar.textContent = session.initials;
    if (nameEl) nameEl.textContent = session.name;
    if (titleEl) titleEl.textContent = session.title;

    // Wire up any logout button
    document.querySelectorAll("[data-action='logout']").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    });
}