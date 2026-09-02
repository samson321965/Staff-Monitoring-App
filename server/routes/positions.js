const express = require("express");

const router = express.Router();

const pool = require("../config/database");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");


// ============================================================
// GET ALL POSITIONS
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "hr", "manager"),
  async (req, res) => {
    try {

      const result = await pool.query(`
        SELECT
          id,
          position_name
        FROM positions
        ORDER BY position_name ASC
      `);

      res.json(result.rows);

    } catch (error) {

      console.error(
        "Error getting positions:",
        error
      );

      res.status(500).json({
        message: "Failed to get positions",
        error: error.message,
      });

    }
  }
);


module.exports = router;