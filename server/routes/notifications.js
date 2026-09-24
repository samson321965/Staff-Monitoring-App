const express = require("express");

const pool = require("../config/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/unread-count", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM notifications
            WHERE user_id = $1
              AND COALESCE(is_read, FALSE) = FALSE
        `, [req.user.id]);

        res.json({ count: result.rows[0]?.count || 0 });
    } catch (error) {
        console.error("Notification count error:", error);
        res.status(500).json({ message: "Unable to load notification count." });
    }
});

module.exports = router;
