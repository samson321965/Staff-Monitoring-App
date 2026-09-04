const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");


/* ======================================================
   GET DASHBOARD DATA
   GET /api/dashboard
====================================================== */

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

      /* ==================================================
         EMPLOYEE COUNT
      ================================================== */

      const employeeResult = await pool.query(`
        SELECT COUNT(*) AS total
        FROM employees
      `);

      const totalEmployees =
        Number(employeeResult.rows[0].total) || 0;


      /* ==================================================
         TODAY'S ATTENDANCE
      ================================================== */

      const attendanceResult = await pool.query(`
        SELECT

          COUNT(*) FILTER (
            WHERE status = 'Present'
          ) AS present,

          COUNT(*) FILTER (
            WHERE status = 'Absent'
          ) AS absent,

          COUNT(*) FILTER (
            WHERE status = 'Late'
          ) AS late,

          COUNT(*) FILTER (
            WHERE status = 'Half Day'
          ) AS "halfDay",

          COUNT(*) FILTER (
            WHERE status = 'Leave'
          ) AS leave

        FROM attendance

        WHERE attendance_date = CURRENT_DATE
      `);


      const attendance =
        attendanceResult.rows[0];


      const present =
        Number(attendance.present) || 0;

      const absent =
        Number(attendance.absent) || 0;

      const late =
        Number(attendance.late) || 0;

      const halfDay =
        Number(attendance.halfDay) || 0;

      const leave =
        Number(attendance.leave) || 0;


      /* ==================================================
         ATTENDANCE RATE
      ================================================== */

      const attendedToday =
        present +
        late +
        halfDay;


      const attendanceRate =
        totalEmployees > 0
          ? Math.round(
              (attendedToday / totalEmployees) * 100
            )
          : 0;


      /* ==================================================
         EMPLOYEES CURRENTLY ON LEAVE
      ================================================== */

      const leaveResult = await pool.query(`
        SELECT
          COUNT(DISTINCT employee_id) AS total

        FROM leave_requests

        WHERE status = 'Approved'

        AND CURRENT_DATE
            BETWEEN start_date AND end_date
      `);


      const employeesOnLeave =
        Number(
          leaveResult.rows[0].total
        ) || 0;


      /* ==================================================
         PENDING LEAVE REQUESTS
      ================================================== */

      const pendingResult = await pool.query(`
        SELECT
          COUNT(*) AS total

        FROM leave_requests

        WHERE status = 'Pending'
      `);


      const pendingRequests =
        Number(
          pendingResult.rows[0].total
        ) || 0;


      /* ==================================================
         EMPLOYEES TRAVELLING

         IMPORTANT:
         If you have a travel table, replace this
         value with your actual travel query.

         For now this returns 0 so the dashboard
         does not fail if no travel table exists.
      ================================================== */

      const employeesTravelling = 0;


      /* ==================================================
         RECENT ATTENDANCE ACTIVITY
      ================================================== */

      const attendanceActivityResult =
        await pool.query(`
          SELECT

            a.id,

            CONCAT(
              e.first_name,
              ' ',
              e.last_name
            ) AS employee,

            a.status,

            a.created_at AS "activityDate",

            CASE

              WHEN a.status = 'Present'
                THEN CONCAT(
                  e.first_name,
                  ' ',
                  e.last_name,
                  ' checked in'
                )

              WHEN a.status = 'Late'
                THEN CONCAT(
                  e.first_name,
                  ' ',
                  e.last_name,
                  ' checked in late'
                )

              WHEN a.status = 'Absent'
                THEN CONCAT(
                  e.first_name,
                  ' ',
                  e.last_name,
                  ' was marked absent'
                )

              WHEN a.status = 'Half Day'
                THEN CONCAT(
                  e.first_name,
                  ' ',
                  e.last_name,
                  ' was marked half day'
                )

              ELSE CONCAT(
                e.first_name,
                ' ',
                e.last_name,
                ' attendance updated'
              )

            END AS description,

            'attendance' AS type

          FROM attendance a

          INNER JOIN employees e
            ON a.employee_id = e.id

          WHERE
            a.attendance_date = CURRENT_DATE

          ORDER BY
            a.created_at DESC

          LIMIT 10
        `);


      /* ==================================================
         RECENT LEAVE ACTIVITY
      ================================================== */

      const leaveActivityResult =
        await pool.query(`
          SELECT

            lr.id,

            CONCAT(
              e.first_name,
              ' ',
              e.last_name
            ) AS employee,

            lr.status,

            lr.created_at AS "activityDate",

            CONCAT(
              e.first_name,
              ' ',
              e.last_name,
              ' submitted a ',
              lr.leave_type,
              ' request'
            ) AS description,

            'leave' AS type

          FROM leave_requests lr

          INNER JOIN employees e
            ON lr.employee_id = e.id

          ORDER BY
            lr.created_at DESC

          LIMIT 10
        `);


      /* ==================================================
         COMBINE RECENT ACTIVITIES
      ================================================== */

      const recentActivity = [
        ...attendanceActivityResult.rows,
        ...leaveActivityResult.rows,
      ]
        .sort(
          (a, b) =>
            new Date(b.activityDate) -
            new Date(a.activityDate)
        )
        .slice(0, 6);


      /* ==================================================
         SEND DASHBOARD RESPONSE
      ================================================== */

      res.status(200).json({

        totalEmployees,

        present,

        absent,

        late,

        halfDay,

        leave,

        attendanceRate,

        employeesTravelling,

        employeesOnLeave,

        pendingRequests,

        recentActivity,

      });

    } catch (error) {

      console.error(
        "Error fetching dashboard data:",
        error
      );

      res.status(500).json({

        message:
          "Server error while fetching dashboard data",

        error:
          error.message,

      });
    }
  }
);


module.exports = router;