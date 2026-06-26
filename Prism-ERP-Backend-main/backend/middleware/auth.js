/* ============================================================
   Identity & Role Guard
   ============================================================
   Prism-ERP's frontend keeps a logged-in session (see
   assets/js/auth.js) and forwards the signed-in user's
   identity on every request using these headers:

     x-user-id      -> users.user_id
     x-employee-id  -> employees.employee_id (omitted for non-employee users)
     x-role         -> 'admin' | 'manager' | 'employee'

   This middleware reads those headers into req.identity and
   exposes helpers so routes can:
     - require the caller to be authenticated at all
     - require a specific role (e.g. manager/admin only)
     - require the caller to be acting on their OWN employee
       record, unless they hold a role allowed to bypass that
       check (e.g. a manager viewing any employee).

   NOTE: Headers are trivially spoofable by a malicious client,
   the same way the current sessionStorage-based login can be.
   This keeps server-side authorization consistent with how the
   rest of the app already trusts the frontend session today.
   When real authentication (JWT / Okta) is wired in, replace
   `attachIdentity` with logic that decodes a verified token
   instead of reading these headers directly.
   ============================================================ */

export const attachIdentity = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const employeeId = req.headers['x-employee-id'];
  const role = req.headers['x-role'];

  req.identity = {
    userId: userId ? Number(userId) : null,
    employeeId: employeeId ? Number(employeeId) : null,
    role: role ? String(role).toLowerCase() : null,
  };

  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.identity || !req.identity.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

export const requireRole = (...roles) => {
  const allowed = roles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    if (!req.identity || !allowed.includes(req.identity.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

/**
 * Ensures the caller is either:
 *   - one of `bypassRoles` (e.g. manager/admin can view anyone), or
 *   - acting on their own employee_id (the value found at
 *     req.params[paramName] or req.body[paramName] must match
 *     req.identity.employeeId).
 */
export const requireSelfOrRole = (paramName, ...bypassRoles) => {
  const allowed = bypassRoles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    if (!req.identity) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (allowed.includes(req.identity.role)) {
      return next();
    }

    const targetId = Number(req.params[paramName] ?? req.body[paramName]);

    if (!req.identity.employeeId || targetId !== req.identity.employeeId) {
      return res.status(403).json({ message: "You can only access your own attendance records" });
    }

    next();
  };
};
