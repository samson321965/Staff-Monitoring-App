const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");


/* ======================================================
   GET ALL LEAVE REQUESTS
   GET /api/leaves
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
        "hr",
        "compliance",
        "officer",
        "employee"
    ),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    lr.id,
                    lr.employee_id AS "employee_id",

                    CONCAT(
                        e.first_name,
                        ' ',
                        e.last_name
                    ) AS employee,

                    e.employee_id AS "employeeId",

                    d.department_name AS department,

                    lr.leave_type AS "leaveType",

                    lr.start_date AS "startDate",

                    lr.end_date AS "endDate",

                    (
                        lr.end_date - lr.start_date + 1
                    ) AS days,

                    lr.reason,

                    lr.status,

                    lr.approved_by AS "approvedBy",

                    lr.approved_at AS "approvedAt",

                    lr.created_at AS "createdAt",

                    lr.updated_at AS "updatedAt"

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                ORDER BY
                    lr.created_at DESC
            `);

            res.status(200).json(result.rows);

        } catch (error) {
            console.error(
                "Error fetching leave requests:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch leave requests",
                error: error.message,
            });
        }
    }
);


/* ======================================================
   GET ALL EMPLOYEES
   GET /api/leaves/employees

   Used by Add Leave form
====================================================== */

router.get(
    "/employees",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "director",
        "deputy_director",
        "manager",
        "hr",
        "officer",
        "employee"
    ),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    e.id,
                    e.employee_id AS "employeeId",

                    CONCAT(
                        e.first_name,
                        ' ',
                        e.last_name
                    ) AS employee,

                    d.department_name AS department

                FROM employees e

                LEFT JOIN departments d
                    ON e.department_id = d.id

                ORDER BY
                    e.first_name ASC,
                    e.last_name ASC
            `);

            res.status(200).json(result.rows);

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


/* ======================================================
   GET ONE LEAVE REQUEST
   GET /api/leaves/:id
====================================================== */

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "commission",
        "director",
        "deputy_director",
        "manager",
        "hr",
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
                    lr.id,
                    lr.employee_id AS "employee_id",

                    CONCAT(
                        e.first_name,
                        ' ',
                        e.last_name
                    ) AS employee,

                    e.employee_id AS "employeeId",

                    d.department_name AS department,

                    lr.leave_type AS "leaveType",

                    lr.start_date AS "startDate",

                    lr.end_date AS "endDate",

                    (
                        lr.end_date - lr.start_date + 1
                    ) AS days,

                    lr.reason,

                    lr.status,

                    lr.approved_by AS "approvedBy",

                    lr.approved_at AS "approvedAt",

                    lr.created_at AS "createdAt",

                    lr.updated_at AS "updatedAt"

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE lr.id = $1
                `,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Leave request not found",
                });
            }

            res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error(
                "Error fetching leave request:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch leave request",
                error: error.message,
            });
        }
    }
);


/* ======================================================
   CREATE LEAVE REQUEST
   POST /api/leaves
====================================================== */

router.post(
    "/",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "director",
        "deputy_director",
        "manager",
        "hr",
        "officer",
        "employee"
    ),
    async (req, res) => {
        try {
            const {
                employee_id,
                leave_type,
                start_date,
                end_date,
                reason,
            } = req.body;


            /* ----------------------------------------------
               VALIDATION
            ---------------------------------------------- */

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


            if (new Date(end_date) < new Date(start_date)) {
                return res.status(400).json({
                    message:
                        "End date cannot be before start date",
                });
            }


            /* ----------------------------------------------
               CHECK EMPLOYEE
            ---------------------------------------------- */

            const employeeCheck = await pool.query(
                `
                SELECT id
                FROM employees
                WHERE id = $1
                `,
                [employee_id]
            );

            if (employeeCheck.rows.length === 0) {
                return res.status(404).json({
                    message: "Employee not found",
                });
            }


            /* ----------------------------------------------
               CHECK DUPLICATE / OVERLAPPING LEAVE
            ---------------------------------------------- */

            const overlapCheck = await pool.query(
                `
                SELECT id
                FROM leave_requests

                WHERE employee_id = $1

                AND status <> 'Rejected'

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

            if (overlapCheck.rows.length > 0) {
                return res.status(400).json({
                    message:
                        "This employee already has a leave request during the selected dates",
                });
            }


            /* ----------------------------------------------
               INSERT
            ---------------------------------------------- */

            const result = await pool.query(
                `
                INSERT INTO leave_requests (
                    employee_id,
                    leave_type,
                    start_date,
                    end_date,
                    reason,
                    status
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'Pending'
                )

                RETURNING *
                `,
                [
                    employee_id,
                    leave_type,
                    start_date,
                    end_date,
                    reason || null,
                ]
            );


            res.status(201).json({
                message:
                    "Leave request created successfully",

                leave:
                    result.rows[0],
            });

        } catch (error) {
            console.error(
                "Error creating leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to create leave request",
                error: error.message,
            });
        }
    }
);


/* ======================================================
   APPROVE LEAVE REQUEST
   PUT /api/leaves/:id/approve
====================================================== */

router.put(
    "/:id/approve",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "director",
        "deputy_director",
        "manager",
        "hr"
    ),
    async (req, res) => {
        try {
            const { id } = req.params;

            const result = await pool.query(
                `
                UPDATE leave_requests

                SET
                    status = 'Approved',
                    approved_by = $1,
                    approved_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $2
                  AND status = 'Pending'

                RETURNING *
                `,
                [
                    req.user.id,
                    id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Pending leave request not found",
                });
            }

            res.status(200).json({
                message:
                    "Leave request approved successfully",

                leave:
                    result.rows[0],
            });

        } catch (error) {
            console.error(
                "Error approving leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to approve leave request",

                error:
                    error.message,
            });
        }
    }
);


/* ======================================================
   UPDATE LEAVE REQUEST
   PUT /api/leaves/:id
====================================================== */

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "director",
        "deputy_director",
        "manager",
        "hr",
        "officer",
        "employee"
    ),
    async (req, res) => {
        try {
            const { id } = req.params;

            const {
                leave_type,
                start_date,
                end_date,
                reason,
            } = req.body;


            /* ----------------------------------------------
               CHECK EXISTING RECORD
            ---------------------------------------------- */

            const existing = await pool.query(
                `
                SELECT *
                FROM leave_requests
                WHERE id = $1
                `,
                [id]
            );

            if (existing.rows.length === 0) {
                return res.status(404).json({
                    message: "Leave request not found",
                });
            }


            const current = existing.rows[0];


            const newLeaveType =
                leave_type || current.leave_type;

            const newStartDate =
                start_date || current.start_date;

            const newEndDate =
                end_date || current.end_date;

            const newReason =
                reason !== undefined
                    ? reason
                    : current.reason;


            /* ----------------------------------------------
               DATE VALIDATION
            ---------------------------------------------- */

            if (
                new Date(newEndDate) <
                new Date(newStartDate)
            ) {
                return res.status(400).json({
                    message:
                        "End date cannot be before start date",
                });
            }


            /* ----------------------------------------------
               UPDATE
            ---------------------------------------------- */

            const result = await pool.query(
                `
                UPDATE leave_requests

                SET
                    leave_type = $1,
                    start_date = $2,
                    end_date = $3,
                    reason = $4,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $5

                RETURNING *
                `,
                [
                    newLeaveType,
                    newStartDate,
                    newEndDate,
                    newReason || null,
                    id,
                ]
            );


            res.status(200).json({
                message:
                    "Leave request updated successfully",

                leave:
                    result.rows[0],
            });

        } catch (error) {
            console.error(
                "Error updating leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update leave request",
                error: error.message,
            });
        }
    }
);


/* ======================================================
   DELETE LEAVE REQUEST
   DELETE /api/leaves/:id
====================================================== */

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "hr"
    ),
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
                        "Leave request not found",
                });
            }

            res.status(200).json({
                message:
                    "Leave request deleted successfully",
            });

        } catch (error) {
            console.error(
                "Error deleting leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to delete leave request",
                error: error.message,
            });
        }
    }
);


module.exports = router;