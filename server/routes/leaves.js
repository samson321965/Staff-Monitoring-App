const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles,
} = require("../middleware/authMiddleware");

/*
===========================================================
VEO LEAVE ROUTES
===========================================================

This version uses the current Staff Monitoring database
relationship:

employees
   -> position_id
positions
   -> section_id
sections
   -> department_id
departments

It also supports the official VEO leave forms:

Form No. 14  - Annual Leave Request
Form No. 15  - Sabbatical / Secondment / Study Leave
Form No. 16  - Study Leave Bonding Agreement
Form No. 17  - Medical Leave Request & Certification
*/

/* ========================================================
   ROLES
======================================================== */

const VIEW_ROLES = [
    "system_admin",
    "commission",
    "director",
    "deputy_director",
    "manager",
    "hr",
    "finance",
    "compliance",
    "ict_officer",
    "officer",
    "employee",
];

const MANAGE_ROLES = [
    "system_admin",
    "director",
    "deputy_director",
    "manager",
    "hr",
];

const DELETE_ROLES = [
    "system_admin",
    "hr",
];

/* ========================================================
   DATABASE SETUP
   Safe/non-destructive:
   - adds new columns only if missing
   - preserves existing records
   - expands leave type constraint
======================================================== */

let schemaReadyPromise = null;

const ensureLeaveSchema = async () => {
    if (!schemaReadyPromise) {
        schemaReadyPromise = (async () => {

            /*
             * Extra fields used by the official VEO forms.
             * Existing leave_requests data is not deleted.
             */

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS form_type VARCHAR(50)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS work_location VARCHAR(100)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(150)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS total_working_days INTEGER
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS travel_claim BOOLEAN DEFAULT FALSE
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS travel_claim_percentage NUMERIC(5,2)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS medical_certificate_status VARCHAR(150)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS requested_duration_months NUMERIC(8,2)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS purpose_justification TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS funding_arrangement VARCHAR(150)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS funding_explanation TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS study_program TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS institution TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS study_location VARCHAR(150)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS payroll_no VARCHAR(50)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS bonding_agreement BOOLEAN DEFAULT FALSE
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS supervisor_recommendation VARCHAR(30)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS supervisor_comments TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS des_recommendation VARCHAR(30)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS des_comments TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS commission_decision VARCHAR(30)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS decision_notes TEXT
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS approved_by INTEGER
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
            `);

            await pool.query(`
                ALTER TABLE employees
                ADD COLUMN IF NOT EXISTS work_location VARCHAR(150)
            `);

            await pool.query(`
                INSERT INTO leave_types (leave_type, is_active)
                VALUES
                    ('Annual Leave', TRUE),
                    ('Medical Leave', TRUE),
                    ('Sabbatical Leave', TRUE),
                    ('Secondment', TRUE),
                    ('Study Leave', TRUE)
                ON CONFLICT (leave_type) DO UPDATE
                SET is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
            `);

            /*
             * The original database used values such as:
             * Annual, Sick, Maternity, Paternity, Emergency, Other.
             *
             * Keep those old values valid and add the official
             * VEO form names.
             */

            await pool.query(`
                ALTER TABLE leave_requests
                DROP CONSTRAINT IF EXISTS check_leave_type
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD CONSTRAINT check_leave_type
                CHECK (
                    leave_type IN (
                        'Annual',
                        'Sick',
                        'Maternity',
                        'Paternity',
                        'Emergency',
                        'Other',
                        'Study',
                        'Annual Leave',
                        'Medical Leave',
                        'Sabbatical Leave',
                        'Secondment',
                        'Study Leave',
                        'Family Leave',
                        'Other Leave'
                    )
                )
            `);
        })().catch((error) => {
            schemaReadyPromise = null;
            throw error;
        });
    }

    return schemaReadyPromise;
};

/* ========================================================
   HELPERS
======================================================== */

const getUserEmployeeId = async (user) => {
    if (!user) return null;

    if (user.employee_id) {
        return Number(user.employee_id);
    }

    if (user.employeeId) {
        return Number(user.employeeId);
    }

    if (user.id) {
        const result = await pool.query(
            `
            SELECT employee_id
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [user.id]
        );

        return result.rows[0]?.employee_id
            ? Number(result.rows[0].employee_id)
            : null;
    }

    return null;
};

const getLeaveQuery = `
    SELECT
        lr.id,
        lr.employee_id AS "employee_id",

        CONCAT(
            e.first_name,
            ' ',
            e.last_name
        ) AS employee,

        e.employee_code AS "employeeId",

        p.position_name AS "positionTitle",
        s.section_name AS section,
        d.department_name AS department,

        lr.form_type AS "formType",
        lr.leave_type AS "leaveType",

        lr.work_location AS "workLocation",
        lr.supervisor_name AS "supervisorName",

        lr.start_date AS "startDate",
        lr.end_date AS "endDate",

        COALESCE(
            lr.total_working_days,
            (
                lr.end_date - lr.start_date + 1
            )
        ) AS days,

        lr.travel_claim AS "travelClaim",
        lr.travel_claim_percentage AS "travelClaimPercentage",

        lr.medical_certificate_status
            AS "medicalCertificateStatus",

        lr.requested_duration_months
            AS "requestedDurationMonths",

        lr.purpose_justification
            AS "purposeJustification",

        lr.funding_arrangement
            AS "fundingArrangement",

        lr.funding_explanation
            AS "fundingExplanation",

        lr.study_program AS "studyProgram",
        lr.institution,
        lr.study_location AS "studyLocation",
        lr.payroll_no AS "payrollNo",
        lr.bonding_agreement AS "bondingAgreement",

        lr.reason,

        lr.supervisor_recommendation
            AS "supervisorRecommendation",

        lr.supervisor_comments
            AS "supervisorComments",

        lr.des_recommendation
            AS "desRecommendation",

        lr.des_comments AS "desComments",

        lr.commission_decision
            AS "commissionDecision",

        lr.decision_notes AS "decisionNotes",

        lr.status,

        lr.approved_by AS "approvedBy",
        lr.approved_at AS "approvedAt",

        lr.created_at AS "createdAt",
        lr.updated_at AS "updatedAt"

    FROM leave_requests lr

    INNER JOIN employees e
        ON lr.employee_id = e.id

    LEFT JOIN positions p
        ON e.position_id = p.id

    LEFT JOIN sections s
        ON p.section_id = s.id

    LEFT JOIN departments d
        ON s.department_id = d.id
`;

/* ========================================================
   GET ALL LEAVE REQUESTS
   GET /api/leaves
======================================================== */

router.get(
    "/",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result = await pool.query(`
                ${getLeaveQuery}
                ORDER BY lr.created_at DESC
            `);

            res.status(200).json(result.rows);
        } catch (error) {
            console.error(
                "Error fetching leave requests:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch leave requests",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   GET ACTIVE EMPLOYEES FOR ADD LEAVE FORM
   GET /api/leaves/employees
======================================================== */

router.get(
    "/employees",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result = await pool.query(`
                SELECT
                    e.id,
                    e.employee_code AS "employeeId",

                    CONCAT(
                        e.first_name,
                        ' ',
                        e.last_name
                    ) AS employee,

                    p.position_name AS "positionTitle",

                    s.section_name AS section,

                    d.department_name AS department,

                    e.work_location AS "workLocation",

                    CONCAT(
                        m.first_name,
                        ' ',
                        m.last_name
                    ) AS supervisor

                FROM employees e

                LEFT JOIN positions p
                    ON e.position_id = p.id

                LEFT JOIN sections s
                    ON p.section_id = s.id

                LEFT JOIN departments d
                    ON s.department_id = d.id

                LEFT JOIN employees m
                    ON e.manager_id = m.id

                WHERE
                    LOWER(
                        COALESCE(
                            e.employment_status,
                            ''
                        )
                    ) <> 'terminated'

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
                message:
                    "Failed to fetch employees",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   GET ONE LEAVE REQUEST
   GET /api/leaves/:id
======================================================== */

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result = await pool.query(
                `
                ${getLeaveQuery}
                WHERE lr.id = $1
                `,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Leave request not found",
                });
            }

            res.status(200).json(
                result.rows[0]
            );
        } catch (error) {
            console.error(
                "Error fetching leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch leave request",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   CREATE LEAVE REQUEST
   POST /api/leaves
======================================================== */

router.post(
    "/",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const {
                employee_id,
                leave_type,
                start_date,
                end_date,

                work_location,
                supervisor_name,
                total_working_days,

                travel_claim,

                medical_certificate_status,

                requested_duration_months,
                purpose_justification,

                funding_arrangement,
                funding_explanation,

                study_program,
                institution,
                study_location,
                payroll_no,
                bonding_agreement,

                reason,
            } = req.body;

            if (
                !employee_id ||
                !leave_type ||
                !start_date ||
                !end_date
            ) {
                return res.status(400).json({
                    message:
                        "Employee, leave type, start date and end date are required.",
                });
            }

            const allowedTypes = [
                "Annual Leave",
                "Medical Leave",
                "Sabbatical Leave",
                "Secondment",
                "Study Leave",
            ];

            if (!allowedTypes.includes(leave_type)) {
                return res.status(400).json({
                    message:
                        "Invalid leave type.",
                });
            }

            if (
                new Date(end_date) <
                new Date(start_date)
            ) {
                return res.status(400).json({
                    message:
                        "End date cannot be before start date.",
                });
            }

            const employeeCheck =
                await pool.query(
                    `
                    SELECT
                        e.id,
                        e.employee_code,
                        e.employment_status
                    FROM employees e
                    WHERE e.id = $1
                    `,
                    [employee_id]
                );

            if (
                employeeCheck.rows.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Employee not found.",
                });
            }

            const employee =
                employeeCheck.rows[0];

            if (
                String(
                    employee.employment_status || ""
                ).toLowerCase() ===
                "terminated"
            ) {
                return res.status(400).json({
                    message:
                        "This employee is terminated and cannot submit a leave request.",
                });
            }

            /*
             * Do not allow overlapping pending/approved
             * leave for the same employee.
             */

            const overlapCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM leave_requests

                    WHERE employee_id = $1

                    AND LOWER(
                        COALESCE(status, '')
                    ) <> 'rejected'

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

            if (
                overlapCheck.rows.length > 0
            ) {
                return res.status(400).json({
                    message:
                        "This employee already has a leave request during the selected dates.",
                });
            }

            /*
             * The official VEO forms use the exact
             * leave type selected by the user.
             */

            const formType = leave_type;

            const travelClaimValue =
                leave_type === "Annual Leave"
                    ? Boolean(travel_claim)
                    : false;

            const travelPercentage =
                travelClaimValue
                    ? 75
                    : null;

            const medicalCertificate =
                leave_type === "Medical Leave"
                    ? (
                        medical_certificate_status ||
                        "Attached"
                    )
                    : null;

            const result = await pool.query(
                `
                INSERT INTO leave_requests (
                    employee_id,
                    leave_type,
                    form_type,

                    start_date,
                    end_date,
                    total_working_days,

                    work_location,
                    supervisor_name,

                    travel_claim,
                    travel_claim_percentage,

                    medical_certificate_status,

                    requested_duration_months,
                    purpose_justification,

                    funding_arrangement,
                    funding_explanation,

                    study_program,
                    institution,
                    study_location,
                    payroll_no,
                    bonding_agreement,

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

                    $7,
                    $8,

                    $9,
                    $10,

                    $11,

                    $12,
                    $13,

                    $14,
                    $15,

                    $16,
                    $17,
                    $18,
                    $19,
                    $20,

                    $21,
                    'Pending'
                )

                RETURNING *
                `,
                [
                    employee_id,
                    leave_type,
                    formType,

                    start_date,
                    end_date,
                    Number(
                        total_working_days || 0
                    ),

                    work_location || null,
                    supervisor_name || null,

                    travelClaimValue,
                    travelPercentage,

                    medicalCertificate,

                    requested_duration_months ||
                        null,
                    purpose_justification ||
                        null,

                    funding_arrangement ||
                        null,
                    funding_explanation ||
                        null,

                    study_program || null,
                    institution || null,
                    study_location || null,
                    payroll_no || null,
                    Boolean(bonding_agreement),

                    reason || null,
                ]
            );

            res.status(201).json({
                message:
                    "Leave request created successfully.",
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
                    "Failed to create leave request.",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   APPROVE LEAVE REQUEST
   PUT /api/leaves/:id/approve
======================================================== */

router.put(
    "/:id/approve",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const approvedBy =
                await getUserEmployeeId(
                    req.user
                );

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
                    approvedBy || null,
                    req.params.id,
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Pending leave request not found.",
                });
            }

            res.status(200).json({
                message:
                    "Leave request approved successfully.",
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
                    "Failed to approve leave request.",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   REJECT LEAVE REQUEST
   PUT /api/leaves/:id/reject
======================================================== */

router.put(
    "/:id/reject",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result = await pool.query(
                `
                UPDATE leave_requests

                SET
                    status = 'Rejected',
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $1
                  AND status = 'Pending'

                RETURNING *
                `,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Pending leave request not found.",
                });
            }

            res.status(200).json({
                message:
                    "Leave request rejected successfully.",
                leave:
                    result.rows[0],
            });
        } catch (error) {
            console.error(
                "Error rejecting leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to reject leave request.",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   UPDATE LEAVE REQUEST
   PUT /api/leaves/:id
======================================================== */

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const {
                leave_type,
                start_date,
                end_date,
                reason,
                purpose_justification,
                funding_arrangement,
                funding_explanation,
                requested_duration_months,
            } = req.body;

            const existing =
                await pool.query(
                    `
                    SELECT *
                    FROM leave_requests
                    WHERE id = $1
                    `,
                    [req.params.id]
                );

            if (
                existing.rows.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Leave request not found.",
                });
            }

            const current =
                existing.rows[0];

            const newLeaveType =
                leave_type ||
                current.leave_type;

            const newStartDate =
                start_date ||
                current.start_date;

            const newEndDate =
                end_date ||
                current.end_date;

            if (
                new Date(newEndDate) <
                new Date(newStartDate)
            ) {
                return res.status(400).json({
                    message:
                        "End date cannot be before start date.",
                });
            }

            const result = await pool.query(
                `
                UPDATE leave_requests

                SET
                    leave_type = $1,
                    form_type = $1,

                    start_date = $2,
                    end_date = $3,

                    reason = $4,
                    purpose_justification = $5,

                    funding_arrangement = $6,
                    funding_explanation = $7,

                    requested_duration_months = $8,

                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $9

                RETURNING *
                `,
                [
                    newLeaveType,
                    newStartDate,
                    newEndDate,
                    reason !== undefined
                        ? reason
                        : current.reason,

                    purpose_justification !==
                    undefined
                        ? purpose_justification
                        : current.purpose_justification,

                    funding_arrangement !==
                    undefined
                        ? funding_arrangement
                        : current.funding_arrangement,

                    funding_explanation !==
                    undefined
                        ? funding_explanation
                        : current.funding_explanation,

                    requested_duration_months !==
                    undefined
                        ? requested_duration_months
                        : current.requested_duration_months,

                    req.params.id,
                ]
            );

            res.status(200).json({
                message:
                    "Leave request updated successfully.",
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
                    "Failed to update leave request.",
                error: error.message,
            });
        }
    }
);

/* ========================================================
   DELETE LEAVE REQUEST
   DELETE /api/leaves/:id
======================================================== */

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles(...DELETE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result = await pool.query(
                `
                DELETE FROM leave_requests
                WHERE id = $1
                RETURNING id
                `,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Leave request not found.",
                });
            }

            res.status(200).json({
                message:
                    "Leave request deleted successfully.",
            });
        } catch (error) {
            console.error(
                "Error deleting leave request:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to delete leave request.",
                error: error.message,
            });
        }
    }
);

module.exports = router;