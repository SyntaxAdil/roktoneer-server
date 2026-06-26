const checkRoleMiddleware = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden - Insufficient permissions",
    });
  }

  next();
};

export default checkRoleMiddleware;