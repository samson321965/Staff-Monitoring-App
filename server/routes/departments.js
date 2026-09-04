const express = require("express");

const router = express.Router();

const pool = require("../config/database");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");


// ============================================================
// GET ALL DEPARTMENTS
// GET /api/departments
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
          department_name
        FROM departments
        ORDER BY department_name ASC
      `);

      res.status(200).json(result.rows);

    } catch (error) {

      console.error(
        "Error getting departments:",
        error
      );

      res.status(500).json({
        message: "Failed to get departments",
        error: error.message,
      });

    }
  }
);


module.exports = router;