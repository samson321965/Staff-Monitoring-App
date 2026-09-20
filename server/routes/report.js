const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles,
} = require("../middleware/authMiddleware");


// ============================================================
// HELPER FUNCTIONS
// ============================================================

const isValidDate = (value) => {
    if (!value || typeof value !== "string") {
        return false;
    }

    // Require YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime());
};


const normalizeDepartment = (department) => {
    if (!department || department === "all") {
        return "all";
    }

    const value = String(department).trim().toLowerCase();

    // Frontend may send "ict", while PostgreSQL department
    // is currently named "IT".
    if (value === "ict") {
        return "IT";
    }

    return department;
};


// ============================================================
// GET REPORT SUMMARY
// GET /api/reports/summary
// ============================================================

router.get(
    "/summary",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "commission",
        "director",
        "deputy_director",
        "manager",
        "hr",
        "finance",
        "compliance"
    ),
    async (req, res) => {
        try {

            // --------------------------------------------------------
            // GET QUERY PARAMETERS
            // --------------------------------------------------------

            const {
                startDate,
                endDate,
                reportType = "all",
                department: requestedDepartment = "all",
            } = req.query;


            // --------------------------------------------------------
            // DEFAULT DATE RANGE
            //
            // If frontend does not send dates, use current month.
            // --------------------------------------------------------

            const now = new Date();

            const defaultEndDate =
                `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2, "0")}-${String(
                    now.getDate()
                ).padStart(2, "0")}`;

            const defaultStartDate =
                `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2, "0")}-01`;


            const selectedStartDate =
                startDate || defaultStartDate;

            const selectedEndDate =
                endDate || defaultEndDate;


            // --------------------------------------------------------
            // VALIDATE DATES
            // --------------------------------------------------------

            if (
                !isValidDate(selectedStartDate) ||
                !isValidDate(selectedEndDate)
            ) {
                return res.status(400).json({
                    message:
                        "Invalid date format. Use YYYY-MM-DD.",
                });
            }


            if (
                selectedEndDate < selectedStartDate
            ) {
                return res.status(400).json({
                    message:
                        "End date cannot be before start date.",
                });
            }


            // --------------------------------------------------------
            // NORMALIZE DEPARTMENT
            // --------------------------------------------------------

            const department =
                normalizeDepartment(
                    requestedDepartment
                );


            // --------------------------------------------------------
            // DEPARTMENT FILTER
            // --------------------------------------------------------

            let departmentFilter = "";

            if (department !== "all") {
                departmentFilter = `
                    AND LOWER(d.department_name) = LOWER($3)
                `;
            }


            // ========================================================
            // TOTAL EMPLOYEES
            //
            // This is the total number of registered employees.
            // It is intentionally NOT restricted by attendance dates.
            // ========================================================

            const totalEmployeesQuery = `
                SELECT COUNT(*) AS total

                FROM employees e

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE 1 = 1

                ${
                    department !== "all"
                        ? departmentFilter
                        : ""
                }
            `;


            const totalEmployeesParams =
                department !== "all"
                    ? [
                        selectedStartDate,
                        selectedEndDate,
                        department,
                    ]
                    : [];


            const totalResult =
                await pool.query(
                    totalEmployeesQuery,
                    totalEmployeesParams
                );


            const totalEmployees =
                Number(
                    totalResult.rows[0]?.total || 0
                );


            // ========================================================
            // ATTENDANCE SUMMARY
            //
            // Uses selected calendar date range.
            // ========================================================

            const attendanceQuery = `
                SELECT

                    COUNT(*) FILTER (
                        WHERE LOWER(a.status) = 'present'
                    ) AS present,

                    COUNT(*) FILTER (
                        WHERE LOWER(a.status) = 'late'
                    ) AS late,

                    COUNT(*) FILTER (
                        WHERE LOWER(a.status) = 'absent'
                    ) AS absent

                FROM attendance a

                INNER JOIN employees e
                    ON a.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE
                    a.attendance_date BETWEEN $1 AND $2

                ${
                    department !== "all"
                        ? "AND LOWER(d.department_name) = LOWER($3)"
                        : ""
                }
            `;


            const attendanceParams =
                department !== "all"
                    ? [
                        selectedStartDate,
                        selectedEndDate,
                        department,
                    ]
                    : [
                        selectedStartDate,
                        selectedEndDate,
                    ];


            const attendanceResult =
                await pool.query(
                    attendanceQuery,
                    attendanceParams
                );


            const attendanceRow =
                attendanceResult.rows[0] || {};


            const present =
                Number(
                    attendanceRow.present || 0
                );


            const late =
                Number(
                    attendanceRow.late || 0
                );


            const absent =
                Number(
                    attendanceRow.absent || 0
                );


            // ========================================================
            // LEAVE SUMMARY
            //
            // Counts leave that overlaps the selected date range.
            // ========================================================

            const leaveQuery = `
                SELECT

                    COUNT(*) FILTER (
                        WHERE LOWER(lr.leave_type)
                        LIKE '%sick%'
                    ) AS sick,

                    COUNT(*) FILTER (
                        WHERE
                            LOWER(lr.leave_type)
                            LIKE '%family%'

                            OR LOWER(lr.leave_type)
                            LIKE '%personal%'
                    ) AS family,

                    COUNT(*) FILTER (
                        WHERE
                            LOWER(lr.leave_type)
                            NOT LIKE '%sick%'

                            AND LOWER(lr.leave_type)
                            NOT LIKE '%family%'

                            AND LOWER(lr.leave_type)
                            NOT LIKE '%personal%'
                    ) AS other,

                    COUNT(*) AS total

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE

                    lr.start_date <= $2

                    AND lr.end_date >= $1

                    AND LOWER(lr.status) IN (
                        'approved',
                        'pending'
                    )

                    ${
                        department !== "all"
                            ? "AND LOWER(d.department_name) = LOWER($3)"
                            : ""
                    }
            `;


            const leaveParams =
                department !== "all"
                    ? [
                        selectedStartDate,
                        selectedEndDate,
                        department,
                    ]
                    : [
                        selectedStartDate,
                        selectedEndDate,
                    ];


            const leaveResult =
                await pool.query(
                    leaveQuery,
                    leaveParams
                );


            const leaveRow =
                leaveResult.rows[0] || {};


            const sick =
                Number(
                    leaveRow.sick || 0
                );


            const family =
                Number(
                    leaveRow.family || 0
                );


            const other =
                Number(
                    leaveRow.other || 0
                );


            const totalLeave =
                Number(
                    leaveRow.total || 0
                );


            // ========================================================
            // DAILY ATTENDANCE TREND
            //
            // Uses selected calendar date range.
            // ========================================================

            const trendQuery = `
                SELECT

                    a.attendance_date AS date,

                    COUNT(*) FILTER (
                        WHERE LOWER(a.status) = 'present'
                    ) AS present,

                    COUNT(*) FILTER (
                        WHERE LOWER(a.status) = 'late'
                    ) AS late,

                    COUNT(*) FILTER (
                        WHERE LOWER(a.status) = 'absent'
                    ) AS absent

                FROM attendance a

                INNER JOIN employees e
                    ON a.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE
                    a.attendance_date BETWEEN $1 AND $2

                ${
                    department !== "all"
                        ? "AND LOWER(d.department_name) = LOWER($3)"
                        : ""
                }

                GROUP BY
                    a.attendance_date

                ORDER BY
                    a.attendance_date ASC
            `;


            const trendResult =
                await pool.query(
                    trendQuery,
                    attendanceParams
                );


            const attendanceTrend =
                trendResult.rows.map(
                    (row) => ({
                        date: row.date,

                        present:
                            Number(
                                row.present || 0
                            ),

                        late:
                            Number(
                                row.late || 0
                            ),

                        absent:
                            Number(
                                row.absent || 0
                            ),
                    })
                );


            // ========================================================
            // EMPLOYEES ON LEAVE DURING SELECTED DATE RANGE
            //
            // IMPORTANT:
            // Previously this used CURRENT_DATE.
            //
            // Now it uses the calendar-selected date range.
            //
            // A leave is counted when it overlaps the selected range:
            //
            // leave.start <= selected.end
            // AND
            // leave.end >= selected.start
            // ========================================================

            const onLeaveQuery = `
                SELECT COUNT(*) AS total

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE

                    lr.start_date <= $2

                    AND lr.end_date >= $1

                    AND LOWER(lr.status) = 'approved'

                    ${
                        department !== "all"
                            ? "AND LOWER(d.department_name) = LOWER($3)"
                            : ""
                    }
            `;


            const onLeaveParams =
                department !== "all"
                    ? [
                        selectedStartDate,
                        selectedEndDate,
                        department,
                    ]
                    : [
                        selectedStartDate,
                        selectedEndDate,
                    ];


            const onLeaveResult =
                await pool.query(
                    onLeaveQuery,
                    onLeaveParams
                );


            const onLeave =
                Number(
                    onLeaveResult.rows[0]?.total || 0
                );


            // ========================================================
            // RECENT REPORTS
            //
            // We now store start_date and end_date in the reports
            // table so generated reports can also be filtered by
            // the calendar range.
            // ========================================================

            let recentReports = [];


            try {

                // ----------------------------------------------------
                // CREATE REPORTS TABLE IF IT DOES NOT EXIST
                // ----------------------------------------------------

                await pool.query(`
                    CREATE TABLE IF NOT EXISTS reports (

                        id SERIAL PRIMARY KEY,

                        name VARCHAR(255) NOT NULL,

                        type VARCHAR(50) NOT NULL,

                        generated_at TIMESTAMP
                            DEFAULT CURRENT_TIMESTAMP,

                        generated_by VARCHAR(255)
                            DEFAULT 'System',

                        format VARCHAR(20)
                            DEFAULT 'PDF',

                        url TEXT,

                        start_date DATE,

                        end_date DATE
                    )
                `);


                // ----------------------------------------------------
                // SAFELY ADD DATE COLUMNS TO EXISTING TABLE
                //
                // This does NOT delete existing records.
                // ----------------------------------------------------

                await pool.query(`
                    ALTER TABLE reports
                    ADD COLUMN IF NOT EXISTS start_date DATE
                `);


                await pool.query(`
                    ALTER TABLE reports
                    ADD COLUMN IF NOT EXISTS end_date DATE
                `);


                // ----------------------------------------------------
                // GET REPORTS THAT OVERLAP SELECTED DATE RANGE
                //
                // Reports with no date information are also included
                // so old report records are not lost.
                // ----------------------------------------------------

                const reportsResult =
                    await pool.query(
                        `
                        SELECT

                            id,
                            name,
                            type,
                            generated_at,
                            generated_by,
                            format,
                            url,
                            start_date,
                            end_date

                        FROM reports

                        WHERE

                            (
                                start_date IS NULL
                                OR end_date IS NULL
                            )

                            OR
                            (
                                start_date <= $2
                                AND end_date >= $1
                            )

                        ORDER BY
                            generated_at DESC

                        LIMIT 10
                        `,
                        [
                            selectedStartDate,
                            selectedEndDate,
                        ]
                    );


                recentReports =
                    reportsResult.rows.map(
                        (report) => ({
                            id:
                                report.id,

                            name:
                                report.name,

                            type:
                                report.type,

                            date:
                                report.generated_at
                                    ? new Date(
                                        report.generated_at
                                    ).toLocaleDateString(
                                        "en-GB",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }
                                    )
                                    : "",

                            generatedBy:
                                report.generated_by ||
                                "System",

                            format:
                                report.format ||
                                "PDF",

                            url:
                                report.url ||
                                "#",

                            startDate:
                                report.start_date
                                    ? report.start_date
                                    : null,

                            endDate:
                                report.end_date
                                    ? report.end_date
                                    : null,
                        })
                    );

            } catch (reportError) {

                console.log(
                    "Reports table query error:",
                    reportError.message
                );

                recentReports = [];
            }


            // ========================================================
            // RESPONSE
            // ========================================================

            res.status(200).json({

                // Return the selected range so frontend can confirm
                // exactly what the server filtered.
                dateRange: {
                    startDate:
                        selectedStartDate,

                    endDate:
                        selectedEndDate,
                },

                summary: {

                    totalEmployees,

                    present,

                    onLeave,

                    absent,

                    late,
                },


                attendanceTrend,


                leaveSummary: {

                    sick,

                    family,

                    other,

                    total:
                        totalLeave,
                },


                recentReports,
            });

        } catch (error) {

            console.error(
                "Reports summary error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to load report summary.",

                error:
                    error.message,
            });
        }
    }
);


// ============================================================
// GENERATE REPORT
// POST /api/reports/generate
// ============================================================

router.post(
    "/generate",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "director",
        "deputy_director",
        "manager",
        "hr",
        "finance"
    ),
    async (req, res) => {

        try {

            const {
                startDate,
                endDate,
                reportType = "all",
                department: requestedDepartment = "all",
            } = req.body;


            // --------------------------------------------------------
            // VALIDATION
            // --------------------------------------------------------

            if (!startDate || !endDate) {

                return res.status(400).json({
                    message:
                        "Start date and end date are required.",
                });
            }


            if (
                !isValidDate(startDate) ||
                !isValidDate(endDate)
            ) {

                return res.status(400).json({
                    message:
                        "Invalid date format. Use YYYY-MM-DD.",
                });
            }


            if (
                endDate < startDate
            ) {

                return res.status(400).json({
                    message:
                        "End date cannot be before start date.",
                });
            }


            // --------------------------------------------------------
            // NORMALIZE DEPARTMENT
            // --------------------------------------------------------

            const department =
                normalizeDepartment(
                    requestedDepartment
                );


            // --------------------------------------------------------
            // CREATE REPORTS TABLE IF IT DOES NOT EXIST
            // --------------------------------------------------------

            await pool.query(`
                CREATE TABLE IF NOT EXISTS reports (

                    id SERIAL PRIMARY KEY,

                    name VARCHAR(255) NOT NULL,

                    type VARCHAR(50) NOT NULL,

                    generated_at TIMESTAMP
                        DEFAULT CURRENT_TIMESTAMP,

                    generated_by VARCHAR(255)
                        DEFAULT 'System',

                    format VARCHAR(20)
                        DEFAULT 'PDF',

                    url TEXT,

                    start_date DATE,

                    end_date DATE
                )
            `);


            // --------------------------------------------------------
            // SAFELY ADD DATE COLUMNS TO EXISTING TABLE
            // --------------------------------------------------------

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS start_date DATE
            `);


            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS end_date DATE
            `);


            // --------------------------------------------------------
            // REPORT NAME
            // --------------------------------------------------------

            const formattedReportType =
                reportType === "all"
                    ? "Staff Monitoring"
                    : reportType.charAt(0).toUpperCase() +
                      reportType.slice(1);


            const reportName =
                `${formattedReportType} Report ${startDate} to ${endDate}`;


            // --------------------------------------------------------
            // SAVE REPORT RECORD
            // --------------------------------------------------------

            const result =
                await pool.query(
                    `
                    INSERT INTO reports
                    (
                        name,
                        type,
                        generated_by,
                        format,
                        url,
                        start_date,
                        end_date
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )

                    RETURNING *
                    `,
                    [

                        reportName,

                        reportType === "all"
                            ? "Attendance"
                            : formattedReportType,

                        req.user.email ||
                            req.user.username ||
                            "System",

                        "PDF",

                        "#",

                        startDate,

                        endDate,
                    ]
                );


            // --------------------------------------------------------
            // RESPONSE
            // --------------------------------------------------------

            res.status(201).json({

                message:
                    "Report generated successfully.",

                report:
                    result.rows[0],

                dateRange: {
                    startDate,

                    endDate,
                },

                department,

                reportType,
            });

        } catch (error) {

            console.error(
                "Generate report error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to generate report.",

                error:
                    error.message,
            });
        }
    }
);


// ============================================================
// DOWNLOAD REPORT
// GET /api/reports/:id/download
// ============================================================

router.get(
    "/:id/download",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "director",
        "deputy_director",
        "manager",
        "hr",
        "finance"
    ),
    async (req, res) => {

        try {

            const { id } = req.params;


            // --------------------------------------------------------
            // GET REPORT
            // --------------------------------------------------------

            const result =
                await pool.query(
                    `
                    SELECT *

                    FROM reports

                    WHERE id = $1
                    `,
                    [id]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Report not found.",
                });
            }


            const report =
                result.rows[0];


            // --------------------------------------------------------
            // TEMPORARY TEXT REPORT
            //
            // Later this can be replaced with a real PDF/XLSX
            // generator.
            // --------------------------------------------------------

            const reportContent = `
STAFF MONITORING SYSTEM
=======================

Report: ${report.name}
Type: ${report.type}

Date Range:
${report.start_date || "Not specified"} to ${report.end_date || "Not specified"}

Generated By: ${report.generated_by}
Generated At: ${report.generated_at}

This report was generated by the Staff Monitoring System.
`;


            res.setHeader(
                "Content-Type",
                "text/plain"
            );


            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${report.name}.txt"`
            );


            res.send(
                reportContent
            );

        } catch (error) {

            console.error(
                "Download report error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to download report.",

                error:
                    error.message,
            });
        }
    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;