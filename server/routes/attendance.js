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

        e.employee_id AS "employeeId",

        CONCAT(
          e.first_name,
          ' ',
          e.last_name
        ) AS employee,

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

      LEFT JOIN departments d
        ON e.department_id = d.id

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
      message: "Server error while fetching attendance records"
    });

  }
});


// ======================================================
// GET ATTENDANCE STATISTICS FOR TODAY
// ======================================================

router.get(
  "/stats",
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

    const result = await pool.query(`
      SELECT

        (
          SELECT COUNT(*)
          FROM employees
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


    // Employees who are present, late, or half day
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
      message: "Server error while fetching attendance statistics"
    });

  }

});


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

        e.employee_id AS "employeeId",

        CONCAT(
          e.first_name,
          ' ',
          e.last_name
        ) AS employee,

        d.department_name AS department,

        a.attendance_date AS date,

        a.check_in AS "checkIn",

        a.check_out AS "checkOut",

        a.status,

        a.notes

      FROM attendance a

      JOIN employees e
        ON a.employee_id = e.id

      LEFT JOIN departments d
        ON e.department_id = d.id

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
      message: "Server error while fetching attendance record"
    });

  }

});


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
      INSERT INTO attendance (
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status,
        notes
      )

      VALUES ($1, $2, $3, $4, $5, $6)

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


    // Duplicate employee attendance on same date
    if (error.code === "23505") {

      return res.status(400).json({
        message:
          "This employee already has an attendance record for this date"
      });

    }


    res.status(500).json({
      message:
        "Server error while creating attendance record"
    });

  }

});


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
        message: "Attendance record not found"
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
        "Server error while updating attendance record"
    });

  }

});


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
        message: "Attendance record not found"
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
        "Server error while deleting attendance record"
    });

  }

});


module.exports = router;