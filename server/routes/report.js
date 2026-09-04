const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles,
} = require("../middleware/authMiddleware");


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
            const {
                startDate = "2025-05-01",
                endDate = "2025-05-20",
                reportType = "all",
                department = "all",
            } = req.query;


            // --------------------------------------------------------
            // Department filter
            // --------------------------------------------------------

            let departmentFilter = "";

            if (department !== "all") {
                departmentFilter = `
                    AND LOWER(d.department_name) = LOWER($3)
                `;
            }


            // --------------------------------------------------------
            // TOTAL EMPLOYEES
            // --------------------------------------------------------

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
                    ? [startDate, endDate, department]
                    : [];


            const totalResult = await pool.query(
                totalEmployeesQuery,
                totalEmployeesParams
            );


            const totalEmployees = Number(
                totalResult.rows[0]?.total || 0
            );


            // --------------------------------------------------------
            // ATTENDANCE SUMMARY
            // --------------------------------------------------------

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
                    ? [startDate, endDate, department]
                    : [startDate, endDate];


            const attendanceResult = await pool.query(
                attendanceQuery,
                attendanceParams
            );


            const attendanceRow =
                attendanceResult.rows[0] || {};


            const present = Number(
                attendanceRow.present || 0
            );

            const late = Number(
                attendanceRow.late || 0
            );

            const absent = Number(
                attendanceRow.absent || 0
            );


            // --------------------------------------------------------
            // LEAVE SUMMARY
            // --------------------------------------------------------

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
                    ? [startDate, endDate, department]
                    : [startDate, endDate];


            const leaveResult = await pool.query(
                leaveQuery,
                leaveParams
            );


            const leaveRow =
                leaveResult.rows[0] || {};


            const sick = Number(
                leaveRow.sick || 0
            );

            const family = Number(
                leaveRow.family || 0
            );

            const other = Number(
                leaveRow.other || 0
            );

            const totalLeave = Number(
                leaveRow.total || 0
            );


            // --------------------------------------------------------
            // DAILY ATTENDANCE TREND
            // --------------------------------------------------------

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


            const trendResult = await pool.query(
                trendQuery,
                attendanceParams
            );


            const attendanceTrend =
                trendResult.rows.map((row) => ({
                    date: row.date,

                    present: Number(
                        row.present || 0
                    ),

                    late: Number(
                        row.late || 0
                    ),

                    absent: Number(
                        row.absent || 0
                    ),
                }));


            // --------------------------------------------------------
            // EMPLOYEES CURRENTLY ON LEAVE
            // --------------------------------------------------------

            const onLeaveQuery = `
                SELECT COUNT(*) AS total

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                LEFT JOIN departments d
                    ON e.department_id = d.id

                WHERE

                    lr.start_date <= CURRENT_DATE

                    AND lr.end_date >= CURRENT_DATE

                    AND LOWER(lr.status) = 'approved'

                    ${
                        department !== "all"
                            ? "AND LOWER(d.department_name) = LOWER($1)"
                            : ""
                    }
            `;


            const onLeaveResult = await pool.query(
                onLeaveQuery,
                department !== "all"
                    ? [department]
                    : []
            );


            const onLeave = Number(
                onLeaveResult.rows[0]?.total || 0
            );


            // --------------------------------------------------------
            // RECENT REPORTS
            // --------------------------------------------------------

            let recentReports = [];


            try {

                const reportsResult = await pool.query(`
                    SELECT

                        id,
                        name,
                        type,
                        generated_at,
                        generated_by,
                        format,
                        url

                    FROM reports

                    ORDER BY
                        generated_at DESC

                    LIMIT 10
                `);


                recentReports =
                    reportsResult.rows.map(
                        (report) => ({
                            id: report.id,

                            name: report.name,

                            type: report.type,

                            date: report.generated_at
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
                        })
                    );

            } catch (reportError) {

                console.log(
                    "Reports table not available yet."
                );

                recentReports = [];
            }


            // --------------------------------------------------------
            // RESPONSE
            // --------------------------------------------------------

            res.status(200).json({

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

                    total: totalLeave,
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
                department = "all",
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
                new Date(endDate) <
                new Date(startDate)
            ) {

                return res.status(400).json({

                    message:
                        "End date cannot be before start date.",
                });
            }


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

                    url TEXT
                )
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

            const result = await pool.query(
                `
                INSERT INTO reports
                (
                    name,
                    type,
                    generated_by,
                    format,
                    url
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
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
                ]
            );


            res.status(201).json({

                message:
                    "Report generated successfully.",

                report:
                    result.rows[0],
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

            const result = await pool.query(
                `
                SELECT *

                FROM reports

                WHERE id = $1
                `,
                [id]
            );


            if (result.rows.length === 0) {

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
            // Later this can be replaced with
            // a real PDF/XLSX generator.
            // --------------------------------------------------------

            const reportContent = `
STAFF MONITORING SYSTEM
=======================

Report: ${report.name}
Type: ${report.type}
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


            res.send(reportContent);

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


module.exports = router;