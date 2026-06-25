/* ============================================================
   Prism-ERP — Auth & Role Access Control
   ============================================================
   Demo-only authentication (no backend). Credentials and roles
   are defined in DEMO_USERS below. Swap this out for a real
   API call when you have a backend ready.
   ============================================================ */

const AUTH_STORAGE_KEY = "prismErpSession";

// Demo user directory: username -> { password, role, name, title }
const DEMO_USERS = {
    "manager@brosbrew.com": {
        password: "manager123",
        role: "manager",
        name: "Maria Santos",
        title: "Operations Manager",
        initials: "MS"
    },
    "employee@brosbrew.com": {
        password: "employee123",
        role: "employee",
        name: "Juan Dela Cruz",
        title: "Staff Employee",
        initials: "JD"
    }
};

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

function login(username, password) {
    const key = (username || "").trim().toLowerCase();
    const user = DEMO_USERS[key];

    if (!user || user.password !== password) {
        return { ok: false, message: "Invalid username or password." };
    }

    setSession({
        username: key,
        role: user.role,
        name: user.name,
        title: user.title,
        initials: user.initials,
        loginAt: Date.now()
    });

    return { ok: true };
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
