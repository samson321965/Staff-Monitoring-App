const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
  authenticateToken,
  authorizeRoles
} = require("../middleware/authMiddleware");


// ======================================================
// GET ALL ATTENDANCE RECORDS
// ======================================================

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
          a.id,

          e.id AS employee_db_id,

          e.employee_code AS "employeeId",

          CONCAT(
            e.first_name,
            ' ',
            e.last_name
          ) AS employee,

          p.position_name AS position,

          s.section_name AS section,

          d.department_name AS department,

          a.attendance_date AS date,

          a.check_in AS "checkIn",

          a.check_out AS "checkOut",

          a.status,

          a.notes,

          a.created_at AS "createdAt"

        FROM attendance a

        JOIN employees e
          ON a.employee_id = e.id

        LEFT JOIN positions p
          ON e.position_id = p.id

        LEFT JOIN sections s
          ON p.section_id = s.id

        LEFT JOIN departments d
          ON s.department_id = d.id

        ORDER BY
          a.attendance_date DESC,
          e.first_name ASC
      `);

      res.status(200).json(result.rows);

    } catch (error) {

      console.error(
        "Error fetching attendance records:",
        error
      );

      res.status(500).json({
        message: "Server error while fetching attendance records",
        error: error.message
      });

    }

  }
);


// ======================================================
// GET ATTENDANCE STATISTICS FOR TODAY
// ======================================================

router.get(
  "/stats",
  authenticateToken,
  authorizeRoles(
    "system_admin",
    "commission",
    "director",
    "deputy_director",
    "manager",
    "hr",
    "ict_officer"
  ),
  async (req, res) => {

    try {

      const result = await pool.query(`
        SELECT

          (
            SELECT COUNT(*)
            FROM employees
            WHERE employment_status = 'Active'
          ) AS "totalEmployees",

          COUNT(*) FILTER (
            WHERE status = 'Present'
          ) AS present,

          COUNT(*) FILTER (
            WHERE status = 'Late'
          ) AS late,

          COUNT(*) FILTER (
            WHERE status = 'Absent'
          ) AS absent,

          COUNT(*) FILTER (
            WHERE status = 'Half Day'
          ) AS "halfDay",

          COUNT(*) FILTER (
            WHERE status = 'Leave'
          ) AS leave

        FROM attendance

        WHERE attendance_date = CURRENT_DATE
      `);


      const stats = result.rows[0];


      const attendedToday =
        Number(stats.present) +
        Number(stats.late) +
        Number(stats.halfDay);


      const totalEmployees =
        Number(stats.totalEmployees);


      const attendanceRate =
        totalEmployees > 0
          ? Math.round(
              (attendedToday / totalEmployees) * 100
            )
          : 0;


      res.status(200).json({

        totalEmployees,

        present: Number(stats.present),

        late: Number(stats.late),

        absent: Number(stats.absent),

        halfDay: Number(stats.halfDay),

        leave: Number(stats.leave),

        attendanceRate

      });

    } catch (error) {

      console.error(
        "Error fetching attendance statistics:",
        error
      );

      res.status(500).json({
        message:
          "Server error while fetching attendance statistics",
        error: error.message
      });

    }

  }
);


// ======================================================
// GET ONE ATTENDANCE RECORD BY ID
// ======================================================

router.get(
  "/:id",
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

      const { id } = req.params;


      const result = await pool.query(
        `
        SELECT
          a.id,

          e.id AS employee_db_id,

          e.employee_code AS "employeeId",

          CONCAT(
            e.first_name,
            ' ',
            e.last_name
          ) AS employee,

          p.position_name AS position,

          s.section_name AS section,

          d.department_name AS department,

          a.attendance_date AS date,

          a.check_in AS "checkIn",

          a.check_out AS "checkOut",

          a.status,

          a.notes,

          a.created_at AS "createdAt"

        FROM attendance a

        JOIN employees e
          ON a.employee_id = e.id

        LEFT JOIN positions p
          ON e.position_id = p.id

        LEFT JOIN sections s
          ON p.section_id = s.id

        LEFT JOIN departments d
          ON s.department_id = d.id

        WHERE a.id = $1
        `,
        [id]
      );


      if (result.rows.length === 0) {

        return res.status(404).json({
          message: "Attendance record not found"
        });

      }


      res.status(200).json(
        result.rows[0]
      );

    } catch (error) {

      console.error(
        "Error fetching attendance record:",
        error
      );

      res.status(500).json({
        message:
          "Server error while fetching attendance record",
        error: error.message
      });

    }

  }
);


// ======================================================
// CREATE ATTENDANCE RECORD
// ======================================================

router.post(
  "/",
  authenticateToken,
  authorizeRoles(
    "system_admin",
    "director",
    "deputy_director",
    "manager",
    "hr",
    "ict_officer"
  ),
  async (req, res) => {

    try {

      const {
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status,
        notes
      } = req.body;


      if (!employee_id || !attendance_date) {

        return res.status(400).json({
          message:
            "Employee ID and attendance date are required"
        });

      }


      const result = await pool.query(
        `
        INSERT INTO attendance
        (
          employee_id,
          attendance_date,
          check_in,
          check_out,
          status,
          notes
        )

        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )

        RETURNING *
        `,
        [
          employee_id,
          attendance_date,
          check_in || null,
          check_out || null,
          status || "Present",
          notes || null
        ]
      );


      res.status(201).json({

        message:
          "Attendance record created successfully",

        attendance:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "Error creating attendance record:",
        error
      );


      if (error.code === "23505") {

        return res.status(400).json({
          message:
            "This employee already has an attendance record for this date"
        });

      }


      if (error.code === "23503") {

        return res.status(400).json({
          message:
            "Invalid employee selected",
          error:
            error.detail
        });

      }


      res.status(500).json({
        message:
          "Server error while creating attendance record",
        error:
          error.message
      });

    }

  }
);


// ======================================================
// UPDATE ATTENDANCE RECORD
// ======================================================

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(
    "system_admin",
    "director",
    "deputy_director",
    "manager",
    "hr",
    "ict_officer"
  ),
  async (req, res) => {

    try {

      const { id } = req.params;


      const {
        check_in,
        check_out,
        status,
        notes
      } = req.body;


      const result = await pool.query(
        `
        UPDATE attendance

        SET
          check_in = $1,
          check_out = $2,
          status = $3,
          notes = $4

        WHERE id = $5

        RETURNING *
        `,
        [
          check_in || null,
          check_out || null,
          status,
          notes || null,
          id
        ]
      );


      if (result.rows.length === 0) {

        return res.status(404).json({
          message:
            "Attendance record not found"
        });

      }


      res.status(200).json({

        message:
          "Attendance record updated successfully",

        attendance:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "Error updating attendance record:",
        error
      );

      res.status(500).json({
        message:
          "Server error while updating attendance record",
        error:
          error.message
      });

    }

  }
);


// ======================================================
// DELETE ATTENDANCE RECORD
// ======================================================

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("system_admin"),
  async (req, res) => {

    try {

      const { id } = req.params;


      const result = await pool.query(
        `
        DELETE FROM attendance

        WHERE id = $1

        RETURNING *
        `,
        [id]
      );


      if (result.rows.length === 0) {

        return res.status(404).json({
          message:
            "Attendance record not found"
        });

      }


      res.status(200).json({

        message:
          "Attendance record deleted successfully"

      });

    } catch (error) {

      console.error(
        "Error deleting attendance record:",
        error
      );

      res.status(500).json({
        message:
          "Server error while deleting attendance record",
        error:
          error.message
      });

    }

  }
);


module.exports = router;

