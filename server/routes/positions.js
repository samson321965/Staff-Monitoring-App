const express = require("express");

const router = express.Router();

const pool = require("../config/database");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");


// ============================================================
// GET ALL POSITIONS
// GET /api/positions
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles(
    "system_admin",
    "commission",
    "director",
    "deputy_director",
    "manager",
    "ict_officer",
    "hr",
    "finance",
    "compliance",
    "officer",
    "employee"
  ),
  async (req, res) => {
    try {

      const result = await pool.query(`
        SELECT
          id,
          position_name
        FROM positions
        ORDER BY position_name ASC
      `);

      res.status(200).json(result.rows);

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