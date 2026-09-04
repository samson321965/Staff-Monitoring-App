const jwt = require("jsonwebtoken");

// ==========================================
// VERIFY JWT TOKEN
// ==========================================
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided.",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "staff_monitor_secret"
        );

        req.user = decoded;

        next();
    } catch (error) {
        console.error("Authentication error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token.",
        });
    }
};

// ==========================================
// CHECK USER ROLE
// ==========================================
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required.",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. You do not have permission.",
                requiredRoles: allowedRoles,
                currentRole: req.user.role,
            });
        }

        next();
    };
};

// ==========================================
// CHECK USER HAS ONE OF SEVERAL PERMISSIONS
// ==========================================
const authorizeAnyRole = (...allowedRoles) => {
    return authorizeRoles(...allowedRoles);
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    authorizeAnyRole,
};