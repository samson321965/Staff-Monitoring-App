const jwt = require("jsonwebtoken");

// ==========================================
// VERIFY JWT TOKEN
// ==========================================
const authenticateToken = (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        // Extract token
        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "staff_monitor_secret"
        );

        // Store user information in request
        req.user = decoded;

        next();

    } catch (error) {

        console.error("Authentication error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};


// ==========================================
// CHECK USER ROLE
// ==========================================
const authorizeRoles = (...allowedRoles) => {

    return (req, res, next) => {

        // Make sure user is authenticated
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // Check role
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. You do not have permission."
            });
        }

        next();
    };
};


module.exports = {
    authenticateToken,
    authorizeRoles
};