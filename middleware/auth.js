/**
 * Auth Middleware - Protect all routes requiring login
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }
  next();
}

/**
 * Admin Only Middleware - Group Admins & Super Admin
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }
  const role = req.session.user.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
  }
  next();
}

/**
 * Super Admin Only Middleware - Main Admin Kandukuri Jagan Only
 */
function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }
  const user = req.session.user;
  if (user.role !== 'super_admin' && user.userid !== '192472374') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Main Super Admin Kandukuri Jagan can perform this action.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireSuperAdmin };
