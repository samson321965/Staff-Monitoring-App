const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// ======================================================
// ALLOWED ROLES
// ======================================================

const allLeaveRoles = [
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
  "employee",
];

const managementRoles = [
  "system_admin",
  "commission",
  "director",
  "deputy_director",
  "manager",
  "hr",
];

// ======================================================
// GET ALL LEAVE RECORDS
// ======================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles(...allLeaveRoles),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          lr.id,
          lr.employee_id,

          e.employee_code,
          e.first_name,
          e.last_name,
          e.email,

          p.id AS position_id,
          p.position_name,

          s.id AS section_id,
          s.section_name,

          d.id AS department_id,
          d.department_name,

          lr.leave_type,
          lr.start_date,
          lr.end_date,
          lr.total_days,
          lr.reason,
          lr.status,
          lr.created_at,
          lr.updated_at

        FROM leave_requests lr

        INNER JOIN employees e
          ON lr.employee_id = e.id

        LEFT JOIN positions p
          ON e.position_id = p.id

        LEFT JOIN sections s
          ON p.section_id = s.id

        LEFT JOIN departments d
          ON s.department_id = d.id

        ORDER BY lr.created_at DESC
      `);

      /*
       * Return the database column names.
       * Leave.jsx supports these names directly.
       */
      res.json(result.rows);
    } catch (error) {
      console.error(
        "Error fetching leave records:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch leave records",
        error: error.message,
      });
    }
  }
);

// ======================================================
// GET ACTIVE EMPLOYEES FOR LEAVE FORM
// ======================================================

router.get(
  "/employees",
  authenticateToken,
  authorizeRoles(...allLeaveRoles),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          e.id,
          e.employee_code,
          e.first_name,
          e.last_name,
          e.email,
          e.employment_status,

          p.position_name,

          s.section_name,

          d.department_name

        FROM employees e

        LEFT JOIN positions p
          ON e.position_id = p.id

        LEFT JOIN sections s
          ON p.section_id = s.id

        LEFT JOIN departments d
          ON s.department_id = d.id

        WHERE LOWER(TRIM(e.employment_status)) = 'active'

        ORDER BY
          e.first_name ASC,
          e.last_name ASC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "Error fetching employees for leave:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch employees",
        error: error.message,
      });
    }
  }
);

// ======================================================
// GET ACTIVE LEAVE TYPES FROM POSTGRESQL
// ======================================================

router.get(
  "/types",
  authenticateToken,
  authorizeRoles(...allLeaveRoles),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          leave_type,
          is_active
        FROM leave_types
        WHERE is_active = TRUE
        ORDER BY id ASC
      `);

      console.log(
        "ACTIVE LEAVE TYPES:",
        result.rows
      );

      res.json(result.rows);
    } catch (error) {
      console.error(
        "Error fetching leave types:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch leave types",
        error: error.message,
      });
    }
  }
);

// ======================================================
// GET SINGLE LEAVE RECORD
// IMPORTANT:
// This must remain AFTER /employees and /types
// ======================================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles(...allLeaveRoles),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT
          lr.id,
          lr.employee_id,

          e.employee_code,
          e.first_name,
          e.last_name,
          e.email,

          p.position_name,
          s.section_name,
          d.department_name,

          lr.leave_type,
          lr.start_date,
          lr.end_date,
          lr.total_days,
          lr.reason,
          lr.status,
          lr.created_at,
          lr.updated_at

        FROM leave_requests lr

        INNER JOIN employees e
          ON lr.employee_id = e.id

        LEFT JOIN positions p
          ON e.position_id = p.id

        LEFT JOIN sections s
          ON p.section_id = s.id

        LEFT JOIN departments d
          ON s.department_id = d.id

        WHERE lr.id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Leave record not found",
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(
        "Error fetching leave record:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch leave record",
        error: error.message,
      });
    }
  }
);

// ======================================================
// ADD LEAVE REQUEST
// ======================================================

router.post(
  "/",
  authenticateToken,
  authorizeRoles(...allLeaveRoles),
  async (req, res) => {
    try {
      const {
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
      } = req.body;

      console.log(
        "ADD LEAVE REQUEST:",
        req.body
      );

      // --------------------------------------------------
      // VALIDATE REQUIRED FIELDS
      // --------------------------------------------------

      if (
        !employee_id ||
        !leave_type ||
        !start_date ||
        !end_date
      ) {
        return res.status(400).json({
          message:
            "Employee, leave type, start date and end date are required",
        });
      }

      // --------------------------------------------------
      // VALIDATE LEAVE TYPE
      //
      // IMPORTANT:
      // Match the submitted value against PostgreSQL
      // without requiring exact letter case or spaces.
      // Then use the REAL database value for INSERT.
      // --------------------------------------------------

      const leaveTypeResult = await pool.query(
        `
        SELECT
          id,
          leave_type,
          is_active
        FROM leave_types
        WHERE LOWER(TRIM(leave_type)) =
              LOWER(TRIM($1))
          AND is_active = TRUE
        LIMIT 1
        `,
        [leave_type]
      );

      if (leaveTypeResult.rows.length === 0) {
        console.error(
          "Invalid leave type received:",
          leave_type
        );

        return res.status(400).json({
          message:
            "Invalid or inactive leave type",
          received_leave_type: leave_type,
        });
      }

      /*
       * This is very important.
       *
       * Instead of inserting the value sent by React,
       * use the exact canonical value stored in
       * PostgreSQL.
       */
      const validLeaveType =
        leaveTypeResult.rows[0].leave_type;

      console.log(
        "VALID DATABASE LEAVE TYPE:",
        validLeaveType
      );

      // --------------------------------------------------
      // VALIDATE EMPLOYEE
      // --------------------------------------------------

      const employeeResult = await pool.query(
        `
        SELECT
          id,
          employment_status
        FROM employees
        WHERE id = $1
        `,
        [employee_id]
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      // --------------------------------------------------
      // CHECK EMPLOYEE ACTIVE STATUS
      // --------------------------------------------------

      if (
        employeeResult.rows[0].employment_status &&
        String(
          employeeResult.rows[0].employment_status
        )
          .trim()
          .toLowerCase() !== "active"
      ) {
        return res.status(400).json({
          message:
            "Selected employee is not active",
        });
      }

      // --------------------------------------------------
      // VALIDATE DATES
      // --------------------------------------------------

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({
          message: "Invalid start date",
        });
      }

      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({
          message: "Invalid end date",
        });
      }

      if (endDate < startDate) {
        return res.status(400).json({
          message:
            "End date cannot be before start date",
        });
      }

      // --------------------------------------------------
      // CALCULATE TOTAL DAYS
      // --------------------------------------------------

      const millisecondsPerDay =
        1000 * 60 * 60 * 24;

      const totalDays =
        Math.floor(
          (endDate - startDate) /
            millisecondsPerDay
        ) + 1;

      // --------------------------------------------------
      // CHECK OVERLAPPING LEAVE
      // --------------------------------------------------

      const overlapResult =
        await pool.query(
          `
          SELECT id
          FROM leave_requests
          WHERE employee_id = $1
            AND status IN ('Pending', 'Approved')
            AND start_date <= $3
            AND end_date >= $2
          LIMIT 1
          `,
          [
            employee_id,
            start_date,
            end_date,
          ]
        );

      if (overlapResult.rows.length > 0) {
        return res.status(400).json({
          message:
            "Employee already has leave during the selected dates",
        });
      }

      // --------------------------------------------------
      // INSERT LEAVE REQUEST
      // --------------------------------------------------

      const result = await pool.query(
        `
        INSERT INTO leave_requests (
          employee_id,
          leave_type,
          start_date,
          end_date,
          total_days,
          reason,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'Pending'
        )
        RETURNING *
        `,
        [
          employee_id,

          /*
           * Use the exact value from leave_types table.
           */
          validLeaveType,

          start_date,
          end_date,
          totalDays,
          reason || null,
        ]
      );

      console.log(
        "LEAVE CREATED:",
        result.rows[0]
      );

      res.status(201).json({
        message:
          "Leave request added successfully",

        leave:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Error adding leave request:",
        error
      );

      res.status(500).json({
        message:
          "Failed to add leave request",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// APPROVE LEAVE
// ======================================================

router.put(
  "/:id/approve",
  authenticateToken,
  authorizeRoles(...managementRoles),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE leave_requests
        SET
          status = 'Approved',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Leave record not found",
        });
      }

      res.json({
        message:
          "Leave approved successfully",

        leave:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Error approving leave:",
        error
      );

      res.status(500).json({
        message:
          "Failed to approve leave",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// REJECT LEAVE
// ======================================================

router.put(
  "/:id/reject",
  authenticateToken,
  authorizeRoles(...managementRoles),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE leave_requests
        SET
          status = 'Rejected',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Leave record not found",
        });
      }

      res.json({
        message:
          "Leave rejected successfully",

        leave:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Error rejecting leave:",
        error
      );

      res.status(500).json({
        message:
          "Failed to reject leave",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// UPDATE LEAVE STATUS / RECORD
// ======================================================

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(...managementRoles),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status,
      } = req.body;

      // --------------------------------------------------
      // IF ONLY STATUS IS PROVIDED
      // --------------------------------------------------

      if (
        status &&
        !employee_id &&
        !leave_type &&
        !start_date &&
        !end_date &&
        !reason
      ) {
        const validStatuses = [
          "Pending",
          "Approved",
          "Rejected",
        ];

        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message:
              "Invalid leave status",
          });
        }

        const result = await pool.query(
          `
          UPDATE leave_requests
          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
          `,
          [status, id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            message:
              "Leave record not found",
          });
        }

        return res.json({
          message:
            "Leave status updated successfully",

          leave:
            result.rows[0],
        });
      }

      // --------------------------------------------------
      // GET EXISTING LEAVE
      // --------------------------------------------------

      const existingResult =
        await pool.query(
          `
          SELECT *
          FROM leave_requests
          WHERE id = $1
          `,
          [id]
        );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          message:
            "Leave record not found",
        });
      }

      const existing =
        existingResult.rows[0];

      // --------------------------------------------------
      // VALIDATE LEAVE TYPE IF CHANGED
      // --------------------------------------------------

      let finalLeaveType =
        existing.leave_type;

      if (leave_type) {
        const leaveTypeResult =
          await pool.query(
            `
            SELECT
              id,
              leave_type,
              is_active
            FROM leave_types
            WHERE LOWER(TRIM(leave_type)) =
                  LOWER(TRIM($1))
              AND is_active = TRUE
            LIMIT 1
            `,
            [leave_type]
          );

        if (
          leaveTypeResult.rows.length === 0
        ) {
          return res.status(400).json({
            message:
              "Invalid or inactive leave type",
          });
        }

        /*
         * Use canonical database value.
         */
        finalLeaveType =
          leaveTypeResult.rows[0].leave_type;
      }

      // --------------------------------------------------
      // FINAL VALUES
      // --------------------------------------------------

      const finalEmployeeId =
        employee_id ||
        existing.employee_id;

      const finalStartDate =
        start_date ||
        existing.start_date;

      const finalEndDate =
        end_date ||
        existing.end_date;

      const finalReason =
        reason !== undefined
          ? reason
          : existing.reason;

      const finalStatus =
        status ||
        existing.status;

      // --------------------------------------------------
      // VALIDATE DATES
      // --------------------------------------------------

      const startDate =
        new Date(finalStartDate);

      const endDate =
        new Date(finalEndDate);

      if (
        Number.isNaN(
          startDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid start date",
        });
      }

      if (
        Number.isNaN(
          endDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid end date",
        });
      }

      if (endDate < startDate) {
        return res.status(400).json({
          message:
            "End date cannot be before start date",
        });
      }

      // --------------------------------------------------
      // CALCULATE TOTAL DAYS
      // --------------------------------------------------

      const millisecondsPerDay =
        1000 * 60 * 60 * 24;

      const totalDays =
        Math.floor(
          (endDate - startDate) /
            millisecondsPerDay
        ) + 1;

      // --------------------------------------------------
      // UPDATE
      // --------------------------------------------------

      const result = await pool.query(
        `
        UPDATE leave_requests
        SET
          employee_id = $1,
          leave_type = $2,
          start_date = $3,
          end_date = $4,
          total_days = $5,
          reason = $6,
          status = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
        `,
        [
          finalEmployeeId,
          finalLeaveType,
          finalStartDate,
          finalEndDate,
          totalDays,
          finalReason,
          finalStatus,
          id,
        ]
      );

      res.json({
        message:
          "Leave record updated successfully",

        leave:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Error updating leave:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update leave",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// DELETE LEAVE
// ======================================================

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles(...managementRoles),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM leave_requests
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Leave record not found",
        });
      }

      res.json({
        message:
          "Leave deleted successfully",

        leave:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Error deleting leave:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete leave",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;