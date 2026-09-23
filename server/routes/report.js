const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");


// ======================================================
// DATE VALIDATION
// ======================================================

const isValidDate = (value) => {
    if (!value || typeof value !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime());
};


// ======================================================
// DEFAULT DATE RANGE
// ======================================================

const getDefaultDateRange = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${day}`;

    return {
        startDate,
        endDate
    };
};


// ======================================================
// NORMALIZE SECTION
// ======================================================

const normalizeSection = (value) => {
    if (!value || value === "all") {
        return "all";
    }

    return String(value).trim();
};

const createPdfBuffer = (lines) => {
    const escapePdfText = (value) => String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const textCommands = lines
        .map((line, index) => `${index === 0 ? "" : "0 -18 Td "}(${escapePdfText(line)}) Tj`)
        .join(" ");

    const content = `BT /F1 12 Tf 50 760 Td ${textCommands} ET`;
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    ];

    let pdf = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
    const offsets = [0];

    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf, "binary"));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, "binary");
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.slice(1)
        .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
        .join("");
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "binary");
};


// ======================================================
// GET REPORT SUMMARY
// ======================================================

router.get(
    "/summary",

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
        "officer"
    ),

    async (req, res) => {

        try {

            // ==================================================
            // GET DATE PARAMETERS
            // ==================================================

            let {
                startDate,
                endDate,
                reportType = "all",
                section = "all"
            } = req.query;


            // ==================================================
            // DEFAULT DATES
            // ==================================================

            if (!startDate || !endDate) {

                const defaults = getDefaultDateRange();

                startDate = defaults.startDate;
                endDate = defaults.endDate;
            }


            // ==================================================
            // VALIDATE DATES
            // ==================================================

            if (!isValidDate(startDate) || !isValidDate(endDate)) {

                return res.status(400).json({
                    message: "Invalid date format. Use YYYY-MM-DD."
                });
            }


            if (startDate > endDate) {

                return res.status(400).json({
                    message: "Start date cannot be after end date."
                });
            }


            section = normalizeSection(section);


            // ==================================================
            // SECTION FILTER
            //
            // employees
            //     ↓
            // positions
            //     ↓
            // sections
            // ==================================================

            let sectionFilter = "";
            let sectionParams = [];

            if (section !== "all") {

                sectionFilter = `
                    AND LOWER(s.section_name) = LOWER($3)
                `;

                sectionParams = [startDate, endDate, section];

            } else {

                sectionParams = [startDate, endDate];
            }


            // ==================================================
            // TOTAL EMPLOYEES
            //
            // IMPORTANT:
            // employees does NOT contain department_id.
            //
            // We use:
            // employees.position_id
            // → positions.section_id
            // → sections
            // ==================================================

            let totalEmployeesQuery = `
                SELECT COUNT(*) AS total
                FROM employees e
                INNER JOIN positions p
                    ON e.position_id = p.id
                INNER JOIN sections s
                    ON p.section_id = s.id
                WHERE e.employment_status <> 'Terminated'
            `;

            let totalEmployeesParams = [];

            if (section !== "all") {

                totalEmployeesQuery += `
                    AND LOWER(s.section_name) = LOWER($1)
                `;

                totalEmployeesParams = [section];
            }


            const totalEmployeesResult =
                await pool.query(
                    totalEmployeesQuery,
                    totalEmployeesParams
                );


            const totalEmployees =
                Number(
                    totalEmployeesResult.rows[0]?.total || 0
                );


            // ==================================================
            // ATTENDANCE SUMMARY
            // ==================================================

            let attendanceQuery = `
                SELECT

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(a.status, '')) = 'present'
                    ) AS present,

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(a.status, '')) = 'late'
                    ) AS late,

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(a.status, '')) = 'absent'
                    ) AS absent

                FROM attendance a

                INNER JOIN employees e
                    ON a.employee_id = e.id

                INNER JOIN positions p
                    ON e.position_id = p.id

                INNER JOIN sections s
                    ON p.section_id = s.id

                WHERE a.attendance_date BETWEEN $1 AND $2
            `;


            if (section !== "all") {

                attendanceQuery += `
                    AND LOWER(s.section_name) = LOWER($3)
                `;
            }


            const attendanceResult =
                await pool.query(
                    attendanceQuery,
                    sectionParams
                );


            const attendanceRow =
                attendanceResult.rows[0] || {};


            const present =
                Number(attendanceRow.present || 0);

            const late =
                Number(attendanceRow.late || 0);

            const absent =
                Number(attendanceRow.absent || 0);


            // ==================================================
            // LEAVE SUMMARY
            //
            // leave_requests:
            // employee_id
            // leave_type
            // start_date
            // end_date
            // status
            // ==================================================

            let leaveQuery = `
                SELECT

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(lr.leave_type, '')) LIKE '%sick%'
                    ) AS sick,

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(lr.leave_type, '')) LIKE '%family%'
                        OR LOWER(COALESCE(lr.leave_type, '')) LIKE '%personal%'
                    ) AS family,

                    COUNT(*) FILTER (
                        WHERE
                            LOWER(COALESCE(lr.leave_type, '')) NOT LIKE '%sick%'
                            AND LOWER(COALESCE(lr.leave_type, '')) NOT LIKE '%family%'
                            AND LOWER(COALESCE(lr.leave_type, '')) NOT LIKE '%personal%'
                    ) AS other,

                    COUNT(*) AS total

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                INNER JOIN positions p
                    ON e.position_id = p.id

                INNER JOIN sections s
                    ON p.section_id = s.id

                WHERE
                    lr.start_date <= $2
                    AND lr.end_date >= $1

                    AND LOWER(COALESCE(lr.status, '')) IN (
                        'approved',
                        'pending'
                    )
            `;


            if (section !== "all") {

                leaveQuery += `
                    AND LOWER(s.section_name) = LOWER($3)
                `;
            }


            const leaveResult =
                await pool.query(
                    leaveQuery,
                    sectionParams
                );


            const leaveRow =
                leaveResult.rows[0] || {};


            const sick =
                Number(leaveRow.sick || 0);

            const family =
                Number(leaveRow.family || 0);

            const other =
                Number(leaveRow.other || 0);

            const totalLeave =
                Number(leaveRow.total || 0);


            // ==================================================
            // ATTENDANCE TREND
            // ==================================================

            let trendQuery = `
                SELECT

                    a.attendance_date AS date,

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(a.status, '')) = 'present'
                    ) AS present,

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(a.status, '')) = 'late'
                    ) AS late,

                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(a.status, '')) = 'absent'
                    ) AS absent

                FROM attendance a

                INNER JOIN employees e
                    ON a.employee_id = e.id

                INNER JOIN positions p
                    ON e.position_id = p.id

                INNER JOIN sections s
                    ON p.section_id = s.id

                WHERE a.attendance_date BETWEEN $1 AND $2
            `;


            if (section !== "all") {

                trendQuery += `
                    AND LOWER(s.section_name) = LOWER($3)
                `;
            }


            trendQuery += `
                GROUP BY a.attendance_date
                ORDER BY a.attendance_date ASC
            `;


            const trendResult =
                await pool.query(
                    trendQuery,
                    sectionParams
                );


            const attendanceTrend =
                trendResult.rows.map(row => ({
                    date: row.date,
                    present: Number(row.present || 0),
                    late: Number(row.late || 0),
                    absent: Number(row.absent || 0)
                }));


            // ==================================================
            // CURRENTLY ON LEAVE
            // ==================================================

            let onLeaveQuery = `
                SELECT COUNT(*) AS total

                FROM leave_requests lr

                INNER JOIN employees e
                    ON lr.employee_id = e.id

                INNER JOIN positions p
                    ON e.position_id = p.id

                INNER JOIN sections s
                    ON p.section_id = s.id

                WHERE

                    lr.start_date <= $2
                    AND lr.end_date >= $1

                    AND LOWER(COALESCE(lr.status, '')) = 'approved'
            `;


            if (section !== "all") {

                onLeaveQuery += `
                    AND LOWER(s.section_name) = LOWER($3)
                `;
            }


            const onLeaveResult =
                await pool.query(
                    onLeaveQuery,
                    sectionParams
                );


            const onLeave =
                Number(
                    onLeaveResult.rows[0]?.total || 0
                );


            // ==================================================
            // REPORTS TABLE
            //
            // Create only if it does not already exist.
            // No existing data is dropped.
            // ==================================================

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

                    end_date DATE,

                    section VARCHAR(255)
                )
            `);


            // ==================================================
            // MAKE SURE REPORT DATE COLUMNS EXIST
            // ==================================================

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS start_date DATE
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS end_date DATE
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS section VARCHAR(255)
            `);


            // ==================================================
            // RECENT REPORTS
            // ==================================================

            const recentReportsResult =
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

                        end_date,

                        section

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

                    ORDER BY generated_at DESC

                    LIMIT 10
                    `,
                    [startDate, endDate]
                );


            const recentReports =
                recentReportsResult.rows.map(report => ({
                    id: report.id,
                    name: report.name,
                    type: report.type,
                    generatedAt: report.generated_at,
                    generatedBy: report.generated_by,
                    format: report.format,
                    url: report.url,
                    startDate: report.start_date,
                    endDate: report.end_date,
                    section: report.section
                }));


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json({

                dateRange: {
                    startDate,
                    endDate
                },

                reportType,

                section,

                summary: {

                    totalEmployees,

                    present,

                    onLeave,

                    absent,

                    late
                },

                attendanceTrend,

                leaveSummary: {

                    sick,

                    family,

                    other,

                    total: totalLeave
                },

                recentReports
            });


        } catch (error) {

            console.error(
                "REPORT SUMMARY ERROR:",
                error
            );

            return res.status(500).json({

                message: "Unable to load report data.",

                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined
            });
        }
    }
);


// ======================================================
// GENERATE REPORT
// ======================================================

router.post(
    "/generate",

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
        "officer"
    ),

    async (req, res) => {

        try {

            let {
                startDate,
                endDate,
                reportType = "all",
                section = "all"
            } = req.body;


            // ==================================================
            // DEFAULT DATE RANGE
            // ==================================================

            if (!startDate || !endDate) {

                const defaults =
                    getDefaultDateRange();

                startDate =
                    startDate || defaults.startDate;

                endDate =
                    endDate || defaults.endDate;
            }


            // ==================================================
            // VALIDATE
            // ==================================================

            if (
                !isValidDate(startDate) ||
                !isValidDate(endDate)
            ) {

                return res.status(400).json({

                    message:
                        "Invalid date format. Use YYYY-MM-DD."
                });
            }


            if (startDate > endDate) {

                return res.status(400).json({

                    message:
                        "Start date cannot be after end date."
                });
            }

            section = normalizeSection(section);


            // ==================================================
            // CREATE REPORT TABLE IF REQUIRED
            // ==================================================

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

                    end_date DATE,

                    section VARCHAR(255)
                )
            `);


            // ==================================================
            // ADD MISSING COLUMNS
            // ==================================================

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS generated_by VARCHAR(255)
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS format VARCHAR(20)
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS url TEXT
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS start_date DATE
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS end_date DATE
            `);

            await pool.query(`
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS section VARCHAR(255)
            `);


            // ==================================================
            // FORMAT REPORT TYPE
            // ==================================================

            let formattedReportType = "Attendance";

            if (reportType === "leave") {

                formattedReportType = "Leave";

            } else if (reportType === "attendance") {

                formattedReportType = "Attendance";

            } else if (reportType === "employee") {

                formattedReportType = "Employee";

            } else if (reportType === "all") {

                formattedReportType = "Staff";
            }


            // ==================================================
            // REPORT NAME
            // ==================================================

            const reportName =
                `${formattedReportType} Report ${startDate} to ${endDate}`;


            // ==================================================
            // GENERATED BY
            // ==================================================

            const generatedBy =
                req.user?.email ||
                req.user?.username ||
                "System";


            // ==================================================
            // INSERT REPORT
            // ==================================================

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
                        end_date,
                        section
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8
                    )

                    RETURNING *
                    `,
                    [
                        reportName,

                        reportType === "all"
                            ? "Attendance"
                            : formattedReportType,

                        generatedBy,

                        "PDF",

                        "#",

                        startDate,

                        endDate,

                        section
                    ]
                );


            return res.status(201).json({

                message:
                    "Report generated successfully.",

                report:
                    result.rows[0]
            });


        } catch (error) {

            console.error(
                "REPORT GENERATE ERROR:",
                error
            );

            return res.status(500).json({

                message:
                    "Unable to generate report.",

                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined
            });
        }
    }
);


// ======================================================
// DOWNLOAD REPORT
// ======================================================

router.get(
    "/:id/download",

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
        "officer"
    ),

    async (req, res) => {

        try {

            const reportId =
                Number(req.params.id);


            if (!Number.isInteger(reportId)) {

                return res.status(400).json({

                    message:
                        "Invalid report ID."
                });
            }


            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM reports
                    WHERE id = $1
                    `,
                    [reportId]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({

                    message:
                        "Report not found."
                });
            }


            const report =
                result.rows[0];


            const pdf = createPdfBuffer([
                "VANUATU ELECTORAL OFFICE",
                "STAFF MONITORING SYSTEM",
                "",
                `Report: ${report.name}`,
                `Report Type: ${report.type}`,
                `Department/Section: ${report.section || "All"}`,
                `Generated By: ${report.generated_by || "System"}`,
                `Generated At: ${report.generated_at || ""}`,
                `Date Range: ${report.start_date || ""} to ${report.end_date || ""}`,
                "",
                "This report was generated by the Staff Monitoring System.",
            ]);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="report-${report.id}.pdf"`
            );
            res.setHeader("Content-Length", pdf.length);

            return res.end(pdf);


        } catch (error) {

            console.error(
                "REPORT DOWNLOAD ERROR:",
                error
            );

            return res.status(500).json({

                message:
                    "Unable to download report."
            });
        }
    }
);


module.exports = router;