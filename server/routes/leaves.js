const express = require("express");
const multer = require("multer");

const router = express.Router();

const pool = require("../config/database");
const {
    calculateWorkingDays,
    getActivePublicHolidays,
} = require("../publicHolidays");

const {
    authenticateToken,
    authorizeRoles,
} = require("../middleware/authMiddleware");

/*
===========================================================
FILE UPLOAD CONFIGURATION
===========================================================

Files are temporarily held in memory by Multer and then
stored directly in PostgreSQL as BYTEA.

Maximum file size: 5 MB
===========================================================
*/

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",

            "image/jpeg",
            "image/png",

            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Invalid file type. Allowed files are PDF, JPG, PNG, DOC, DOCX, XLS and XLSX."
                )
            );
        }
    },
});

/*
===========================================================
VEO LEAVE ROUTES
===========================================================
*/

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

/*
===========================================================
ANNUAL LEAVE
===========================================================
*/

const ANNUAL_LEAVE_ALLOWANCE = 24;

/*
===========================================================
DATABASE SCHEMA
===========================================================
*/

let schemaReadyPromise = null;

const ensureLeaveSchema = async () => {
    if (!schemaReadyPromise) {
        schemaReadyPromise = (async () => {

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

            /*
             * Attachment columns.
             */

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS attachment_data BYTEA
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(150)
            `);

            await pool.query(`
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS attachment_path TEXT
            `);

            await pool.query(`
                ALTER TABLE employees
                ADD COLUMN IF NOT EXISTS work_location VARCHAR(150)
            `);

            /*
             * Official VEO leave types.
             */

            await pool.query(`
                INSERT INTO leave_types (
                    leave_type,
                    is_active
                )
                VALUES
                    ('Annual Leave', TRUE),
                    ('Medical Leave', TRUE),
                    ('Sabbatical Leave', TRUE),
                    ('Secondment', TRUE),
                    ('Study Leave', TRUE)
                ON CONFLICT (leave_type) DO UPDATE
                SET
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
            `);

            /*
             * Leave type constraint.
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

/*
===========================================================
HELPERS
===========================================================
*/

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

const getAnnualLeaveUsedDays = async (
    employeeId,
    holidayDates,
    excludedLeaveId = null
) => {
    const result = await pool.query(`
        SELECT
            lr.start_date::text AS start_date,
            lr.end_date::text AS end_date
        FROM leave_requests lr
        WHERE
            lr.employee_id = $1
            AND ($2::bigint IS NULL OR lr.id <> $2)
            AND LOWER(TRIM(COALESCE(lr.leave_type, ''))) IN ('annual leave', 'annual')
            AND LOWER(TRIM(COALESCE(lr.status, ''))) IN ('approved', 'pending')
    `, [employeeId, excludedLeaveId]);

    return result.rows.reduce(
        (total, leave) => total + calculateWorkingDays(
            leave.start_date,
            leave.end_date,
            holidayDates
        ),
        0
    );
};

const normalizeLeaveType = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
};

const normalizeStatus = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};

/*
===========================================================
COMMON LEAVE QUERY
===========================================================
*/

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

        lr.des_comments
            AS "desComments",

        lr.commission_decision
            AS "commissionDecision",

        lr.decision_notes
            AS "decisionNotes",

        /*
         * Attachment information.
         *
         * Do NOT return attachment_data here.
         */

        lr.attachment_name AS "attachmentName",

        lr.attachment_type AS "attachmentType",

        CASE
            WHEN lr.attachment_data IS NOT NULL
            THEN TRUE
            ELSE FALSE
        END AS "hasAttachment",

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

/*
===========================================================
GET ALL LEAVE REQUESTS
===========================================================
*/

router.get(
    "/",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();
            const holidays = await getActivePublicHolidays();
            const holidayDates = new Set(holidays.map((holiday) => holiday.date));

            const result = await pool.query(`
                ${getLeaveQuery}
                ORDER BY lr.created_at DESC
            `);

            res.status(200).json(
                result.rows.map((leave) => ({
                    ...leave,
                    days: calculateWorkingDays(
                        leave.startDate,
                        leave.endDate,
                        holidayDates
                    ),
                }))
            );
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

/*
===========================================================
GET ACTIVE EMPLOYEES
===========================================================
*/

router.get(
    "/employees",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();
            const holidays = await getActivePublicHolidays();
            const holidayDates = new Set(holidays.map((holiday) => holiday.date));

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

            res.status(200).json(
                result.rows
            );
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

/*
===========================================================
GET ANNUAL LEAVE BALANCE
===========================================================
*/

router.get(
    "/balance/:employeeId",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();
            const holidays = await getActivePublicHolidays();
            const holidayDates = new Set(holidays.map((holiday) => holiday.date));

            const employeeId =
                Number(req.params.employeeId);

            if (
                !Number.isInteger(employeeId) ||
                employeeId <= 0
            ) {
                return res.status(400).json({
                    message:
                        "Invalid employee ID.",
                });
            }

            const employeeResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        employee_code,
                        first_name,
                        last_name,
                        employment_status
                    FROM employees
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [employeeId]
                );

            if (
                employeeResult.rows.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Employee not found.",
                });
            }

            const employee =
                employeeResult.rows[0];

            const leaveResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        leave_type,
                        status,
                        start_date,
                        end_date,
                        total_working_days
                    FROM leave_requests

                    WHERE employee_id = $1

                    AND LOWER(
                        TRIM(
                            COALESCE(
                                leave_type,
                                ''
                            )
                        )
                    ) IN (
                        'annual leave',
                        'annual'
                    )

                    AND LOWER(
                        TRIM(
                            COALESCE(
                                status,
                                ''
                            )
                        )
                    ) IN (
                        'approved',
                        'pending'
                    )

                    ORDER BY start_date ASC
                    `,
                    [employeeId]
                );

            let approvedDays = 0;
            let pendingDays = 0;

            for (
                const leave
                of leaveResult.rows
            ) {
                const days = calculateWorkingDays(
                    leave.start_date,
                    leave.end_date,
                    holidayDates
                );

                if (days <= 0) {
                    continue;
                }

                const status =
                    normalizeStatus(
                        leave.status
                    );

                if (
                    status === "approved"
                ) {
                    approvedDays += days;
                }

                if (
                    status === "pending"
                ) {
                    pendingDays += days;
                }
            }

            const totalUsedDays =
                approvedDays +
                pendingDays;

            const remainingDays =
                Math.max(
                    0,
                    ANNUAL_LEAVE_ALLOWANCE -
                    totalUsedDays
                );

            res.status(200).json({
                employeeId:
                    employee.id,

                employeeCode:
                    employee.employee_code,

                employee:
                    `${employee.first_name} ${employee.last_name}`,

                annualLeaveAllowance:
                    ANNUAL_LEAVE_ALLOWANCE,

                annualLeaveUsed:
                    approvedDays,

                annualLeavePending:
                    pendingDays,

                annualLeaveReserved:
                    pendingDays,

                annualLeaveTotalUsed:
                    totalUsedDays,

                annualLeaveBalance:
                    remainingDays,
            });
        } catch (error) {
            console.error(
                "Error calculating annual leave balance:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to calculate annual leave balance.",
                error: error.message,
            });
        }
    }
);

/*
===========================================================
DOWNLOAD / VIEW ATTACHMENT
GET /api/leaves/:id/attachment
===========================================================

IMPORTANT:
This route MUST appear before GET /:id.
===========================================================
*/

router.get(
    "/:id/attachment",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result =
                await pool.query(
                    `
                    SELECT
                        attachment_name,
                        attachment_type,
                        attachment_data
                    FROM leave_requests
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [req.params.id]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Leave request not found.",
                });
            }

            const attachment =
                result.rows[0];

            if (
                !attachment.attachment_data
            ) {
                return res.status(404).json({
                    message:
                        "No attachment found for this leave request.",
                });
            }

            res.setHeader(
                "Content-Type",
                attachment.attachment_type ||
                "application/octet-stream"
            );

            /*
             * Use attachment name safely.
             */

            const fileName =
                String(
                    attachment.attachment_name ||
                    "attachment"
                )
                    .replace(/"/g, "")
                    .replace(/\r/g, "")
                    .replace(/\n/g, "");

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${fileName}"`
            );

            res.send(
                attachment.attachment_data
            );
        } catch (error) {
            console.error(
                "Error retrieving leave attachment:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to retrieve attachment.",
                error: error.message,
            });
        }
    }
);

/*
===========================================================
GET ONE LEAVE REQUEST
===========================================================
*/

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result =
                await pool.query(
                    `
                    ${getLeaveQuery}
                    WHERE lr.id = $1
                    `,
                    [req.params.id]
                );

            if (
                result.rows.length === 0
            ) {
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

/*
===========================================================
CREATE LEAVE REQUEST
POST /api/leaves
===========================================================
*/

router.post(
    "/",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    upload.single("attachment"),
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

            /*
             * =================================================
             * ATTACHMENT
             * =================================================
             *
             * Multer provides:
             *
             * req.file.originalname
             * req.file.mimetype
             * req.file.buffer
             */

            const attachmentName =
                req.file?.originalname ||
                null;

            const attachmentType =
                req.file?.mimetype ||
                null;

            const attachmentData =
                req.file?.buffer ||
                null;

            console.log(
                "Leave attachment:",
                {
                    name: attachmentName,
                    type: attachmentType,
                    size:
                        attachmentData
                            ? attachmentData.length
                            : 0,
                }
            );

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

            if (
                !allowedTypes.includes(
                    leave_type
                )
            ) {
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

            const workingDays = calculateWorkingDays(
                start_date,
                end_date,
                holidayDates
            );

            if (workingDays <= 0) {
                return res.status(400).json({
                    message:
                        "The selected dates contain no working days.",
                });
            }

            /*
             * Check employee.
             */

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
                    employee.employment_status ||
                    ""
                ).toLowerCase() ===
                "terminated"
            ) {
                return res.status(400).json({
                    message:
                        "This employee is terminated and cannot submit a leave request.",
                });
            }

            /*
             * Check overlapping leave.
             */

            const overlapCheck =
                await pool.query(
                    `
                    SELECT
                        id,
                        leave_type,
                        status,
                        start_date,
                        end_date
                    FROM leave_requests

                    WHERE employee_id = $1

                    AND LOWER(
                        COALESCE(
                            status,
                            ''
                        )
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
             * Annual leave balance.
             */

            if (
                normalizeLeaveType(
                    leave_type
                ) === "annual leave"
            ) {
                const usedDays = await getAnnualLeaveUsedDays(
                    employee_id,
                    holidayDates
                );

                const remainingDays =
                    Math.max(
                        0,
                        ANNUAL_LEAVE_ALLOWANCE -
                        usedDays
                    );

                if (
                    workingDays >
                    remainingDays
                ) {
                    return res.status(400).json({
                        message:
                            `Annual Leave allowance exceeded. ` +
                            `This employee has only ` +
                            `${remainingDays} ` +
                            `working day(s) remaining ` +
                            `from the ${ANNUAL_LEAVE_ALLOWANCE}-day annual allowance.`,

                        annualLeaveAllowance:
                            ANNUAL_LEAVE_ALLOWANCE,

                        annualLeaveUsed:
                            usedDays,

                        annualLeaveBalance:
                            remainingDays,

                        requestedDays:
                            workingDays,
                    });
                }
            }

            /*
             * Form type.
             */

            const formType =
                leave_type;

            /*
             * Travel claim.
             */

            const travelClaimValue =
                leave_type === "Annual Leave"
                    ? String(
                        travel_claim
                    ).toLowerCase() ===
                        "true"
                    : false;

            const travelPercentage =
                travelClaimValue
                    ? 75
                    : null;

            /*
             * Medical certificate.
             */

            const medicalCertificate =
                leave_type === "Medical Leave"
                    ? (
                        medical_certificate_status ||
                        "Attached"
                    )
                    : null;

            /*
             * =================================================
             * INSERT LEAVE REQUEST
             * =================================================
             *
             * Attachment is stored directly in PostgreSQL
             * BYTEA column.
             */

            const result =
                await pool.query(
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

                        attachment_name,
                        attachment_type,
                        attachment_data,

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

                        $22,
                        $23,
                        $24,

                        'Pending'
                    )

                    RETURNING
                        id,
                        employee_id,
                        leave_type,
                        form_type,
                        start_date,
                        end_date,
                        total_working_days,
                        attachment_name,
                        attachment_type,
                        CASE
                            WHEN attachment_data IS NOT NULL
                            THEN TRUE
                            ELSE FALSE
                        END AS has_attachment,
                        status,
                        created_at,
                        updated_at
                    `,
                    [
                        employee_id,
                        leave_type,
                        formType,

                        start_date,
                        end_date,
                        workingDays,

                        work_location ||
                            null,

                        supervisor_name ||
                            null,

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

                        study_program ||
                            null,

                        institution ||
                            null,

                        study_location ||
                            null,

                        payroll_no ||
                            null,

                        String(
                            bonding_agreement
                        ).toLowerCase() ===
                            "true",

                        reason ||
                            null,

                        attachmentName,
                        attachmentType,
                        attachmentData,
                    ]
                );

            /*
             * Calculate new annual balance.
             */

            let annualLeaveBalance =
                null;

            if (
                normalizeLeaveType(
                    leave_type
                ) === "annual leave"
            ) {
                const usedDays = await getAnnualLeaveUsedDays(
                    employee_id,
                    holidayDates
                );

                annualLeaveBalance =
                    Math.max(
                        0,
                        ANNUAL_LEAVE_ALLOWANCE -
                        usedDays
                    );
            }

            res.status(201).json({
                message:
                    "Leave request created successfully.",

                leave:
                    result.rows[0],

                ...(annualLeaveBalance !==
                null
                    ? {
                        annualLeaveAllowance:
                            ANNUAL_LEAVE_ALLOWANCE,

                        annualLeaveBalance,
                    }
                    : {}),
            });

        } catch (error) {
            console.error(
                "Error creating leave request:",
                error
            );

            /*
             * Multer file too large.
             */

            if (
                error instanceof multer.MulterError
            ) {
                if (
                    error.code ===
                    "LIMIT_FILE_SIZE"
                ) {
                    return res.status(413).json({
                        message:
                            "Attachment is too large. Maximum allowed size is 5 MB.",
                    });
                }

                return res.status(400).json({
                    message:
                        `File upload error: ${error.message}`,
                });
            }

            /*
             * Invalid file type.
             */

            if (
                error.message &&
                error.message.startsWith(
                    "Invalid file type"
                )
            ) {
                return res.status(400).json({
                    message:
                        error.message,
                });
            }

            res.status(500).json({
                message:
                    "Failed to create leave request.",
                error: error.message,
            });
        }
    }
);

/*
===========================================================
APPROVE LEAVE REQUEST
===========================================================
*/

router.put(
    "/:id/approve",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();
            const holidays = await getActivePublicHolidays();
            const holidayDates = new Set(holidays.map((holiday) => holiday.date));

            const approvedBy =
                await getUserEmployeeId(
                    req.user
                );

            const leaveCheck =
                await pool.query(
                    `
                    SELECT
                        id,
                        employee_id,
                        leave_type,
                        status,
                        total_working_days,
                        start_date,
                        end_date
                    FROM leave_requests
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [req.params.id]
                );

            if (
                leaveCheck.rows.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Leave request not found.",
                });
            }

            const leave =
                leaveCheck.rows[0];

            const requestedDays = calculateWorkingDays(
                leave.start_date,
                leave.end_date,
                holidayDates
            );

            if (requestedDays <= 0) {
                return res.status(400).json({
                    message: "This request contains no working days after excluding public holidays.",
                });
            }

            if (
                normalizeStatus(
                    leave.status
                ) !== "pending"
            ) {
                return res.status(404).json({
                    message:
                        "Pending leave request not found.",
                });
            }

            if (
                normalizeLeaveType(
                    leave.leave_type
                ) === "annual leave"
            ) {
                const usedDays = await getAnnualLeaveUsedDays(
                    leave.employee_id,
                    holidayDates,
                    leave.id
                );

                const remainingDays =
                    Math.max(
                        0,
                        ANNUAL_LEAVE_ALLOWANCE -
                        usedDays
                    );

                if (
                    requestedDays >
                    remainingDays
                ) {
                    return res.status(400).json({
                        message:
                            `Cannot approve this Annual Leave request. ` +
                            `Only ${remainingDays} ` +
                            `working day(s) remain from the ` +
                            `${ANNUAL_LEAVE_ALLOWANCE}-day annual allowance.`,

                        annualLeaveAllowance:
                            ANNUAL_LEAVE_ALLOWANCE,

                        annualLeaveUsed:
                            usedDays,

                        annualLeaveBalance:
                            remainingDays,

                        requestedDays,
                    });
                }
            }

            const result =
                await pool.query(
                    `
                    UPDATE leave_requests

                    SET
                        status = 'Approved',

                        total_working_days = $3,

                        approved_by = $1,

                        approved_at =
                            CURRENT_TIMESTAMP,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = $2
                        AND status = 'Pending'

                    RETURNING *
                    `,
                    [
                        approvedBy || null,
                        req.params.id,
                        requestedDays,
                    ]
                );

            if (
                result.rows.length === 0
            ) {
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

/*
===========================================================
REJECT LEAVE REQUEST
===========================================================
*/

router.put(
    "/:id/reject",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result =
                await pool.query(
                    `
                    UPDATE leave_requests

                    SET
                        status = 'Rejected',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = $1
                        AND status = 'Pending'

                    RETURNING *
                    `,
                    [req.params.id]
                );

            if (
                result.rows.length === 0
            ) {
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

/*
===========================================================
UPDATE LEAVE REQUEST
===========================================================
*/

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();
            const holidays = await getActivePublicHolidays();
            const holidayDates = new Set(holidays.map((holiday) => holiday.date));

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

            const newWorkingDays = calculateWorkingDays(
                newStartDate,
                newEndDate,
                holidayDates
            );

            if (newWorkingDays <= 0) {
                return res.status(400).json({
                    message: "The selected dates contain no working days after excluding public holidays.",
                });
            }

            if (
                normalizeLeaveType(
                    newLeaveType
                ) === "annual leave"
            ) {
                const usedDays = await getAnnualLeaveUsedDays(
                    current.employee_id,
                    holidayDates,
                    req.params.id
                );

                const remainingDays =
                    Math.max(
                        0,
                        ANNUAL_LEAVE_ALLOWANCE -
                        usedDays
                    );

                if (
                    newWorkingDays >
                    remainingDays
                ) {
                    return res.status(400).json({
                        message:
                            `Annual Leave allowance exceeded. ` +
                            `Only ${remainingDays} ` +
                            `working day(s) remain.`,

                        annualLeaveAllowance:
                            ANNUAL_LEAVE_ALLOWANCE,

                        annualLeaveUsed:
                            usedDays,

                        annualLeaveBalance:
                            remainingDays,

                        requestedDays:
                            newWorkingDays,
                    });
                }
            }

            const result =
                await pool.query(
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

                        total_working_days = $10,

                        updated_at =
                            CURRENT_TIMESTAMP

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

                        calculateWorkingDays(
                            newStartDate,
                            newEndDate,
                            holidayDates
                        ),
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

/*
===========================================================
DELETE LEAVE REQUEST
===========================================================
*/

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles(...DELETE_ROLES),
    async (req, res) => {
        try {
            await ensureLeaveSchema();

            const result =
                await pool.query(
                    `
                    DELETE FROM leave_requests
                    WHERE id = $1
                    RETURNING id
                    `,
                    [req.params.id]
                );

            if (
                result.rows.length === 0
            ) {
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

/*
===========================================================
MULTER / UPLOAD ERROR HANDLER
===========================================================

This catches errors that happen before the POST
handler's try/catch, especially file-size errors.
===========================================================
*/

router.use(
    (error, req, res, next) => {
        console.error(
            "Leave upload error:",
            error
        );

        if (
            error instanceof multer.MulterError
        ) {
            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {
                return res.status(413).json({
                    message:
                        "Attachment is too large. Maximum allowed size is 5 MB.",
                });
            }

            return res.status(400).json({
                message:
                    `File upload error: ${error.message}`,
            });
        }

        if (
            error.message &&
            error.message.startsWith(
                "Invalid file type"
            )
        ) {
            return res.status(400).json({
                message:
                    error.message,
            });
        }

        next(error);
    }
);

module.exports = router;