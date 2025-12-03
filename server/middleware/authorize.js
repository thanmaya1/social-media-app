// Require a role (or any of several roles) to access a route
module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !Array.isArray(user.roles))
        return res.status(401).json({ error: 'Unauthorized' });
      // If no roles required, allow
      if (allowedRoles.length === 0) return next();
      const has = user.roles.some((r) => allowedRoles.includes(r));
      if (!has) return res.status(403).json({ error: 'Forbidden' });
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Server error' });
    }
  };
};
