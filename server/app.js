const express = require("express");
const path = require("path");
const cors = require("cors");

require("dotenv").config({
    path: path.join(__dirname, ".env"),
});

const pool = require("./config/database");

// ===========================================================
// ROUTES
// ===========================================================

const employeeRoutes = require("./routes/employees");
const leaveRoutes = require("./routes/leaves");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const reportRoutes = require("./routes/report");
const authRoutes = require("./routes/auth");
const departmentsRoutes = require("./routes/departments");
const positionsRoutes = require("./routes/positions");
const administrationRoutes = require("./routes/administration");
const notificationRoutes = require("./routes/notifications");
const settingsRoutes = require("./routes/settings");
const holidayRoutes = require("./routes/holidays");

const app = express();

// ===========================================================
// MIDDLEWARE
// ===========================================================

// Allow frontend requests
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

// -----------------------------------------------------------
// JSON REQUESTS
// -----------------------------------------------------------
// Used for normal API requests.
// Leave attachments use multipart/form-data through Multer,
// so this middleware does not process the attachment itself.

app.use(
    express.json({
        limit: "10mb",
        type: ["application/json", "application/*+json"],
    })
);

// -----------------------------------------------------------
// URL ENCODED REQUESTS
// -----------------------------------------------------------

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    })
);

// ===========================================================
// API ROUTES
// ===========================================================

app.use("/api/auth", authRoutes);

app.use("/api/employees", employeeRoutes);

app.use("/api/leaves", leaveRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/departments", departmentsRoutes);

app.use("/api/positions", positionsRoutes);

app.use("/api/administration", administrationRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/holidays", holidayRoutes);

// ===========================================================
// HOME ROUTE
// ===========================================================

app.get("/", (req, res) => {
    res.status(200).send("Staff Monitoring API is Running...");
});

// ===========================================================
// TEST DATABASE CONNECTION
// ===========================================================

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");

        res.status(200).json({
            message: "Database connection successful!",
            time: result.rows[0].current_time,
        });
    } catch (error) {
        console.error("========================================");
        console.error("DATABASE TEST ERROR");
        console.error("========================================");
        console.error(error);
        console.error("========================================");

        res.status(500).json({
            message: "Database connection failed",
            error: error.message,
        });
    }
});

// ===========================================================
// 404 ROUTE
// ===========================================================
// If the requested API route does not exist.

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found.",
        method: req.method,
        path: req.originalUrl,
    });
});

// ===========================================================
// GLOBAL ERROR HANDLER
// ===========================================================

app.use((error, req, res, next) => {
    console.error("");
    console.error("==================================================");
    console.error("GLOBAL SERVER ERROR");
    console.error("==================================================");
    console.error("Method:", req.method);
    console.error("URL:", req.originalUrl);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:");
    console.error(error?.stack || error);
    console.error("==================================================");
    console.error("");

    // -------------------------------------------------------
    // REQUEST TOO LARGE
    // -------------------------------------------------------

    if (
        error &&
        (
            error.type === "entity.too.large" ||
            error.status === 413 ||
            error.statusCode === 413
        )
    ) {
        return res.status(413).json({
            message: "Request payload is too large.",
            error: error.message,
        });
    }

    // -------------------------------------------------------
    // MULTER FILE SIZE ERROR
    // -------------------------------------------------------

    if (error && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            message: "Attachment is too large.",
            error: "Maximum attachment size is 5 MB.",
        });
    }

    // -------------------------------------------------------
    // MULTER FILE COUNT ERROR
    // -------------------------------------------------------

    if (error && error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
            message: "Too many files uploaded.",
            error: error.message,
        });
    }

    // -------------------------------------------------------
    // MULTER FIELD ERROR
    // -------------------------------------------------------

    if (error && error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
            message: "Unexpected file field.",
            error: `The uploaded file field "${error.field || "unknown"}" is not accepted.`,
        });
    }

    // -------------------------------------------------------
    // MULTER GENERAL ERROR
    // -------------------------------------------------------

    if (error && error.name === "MulterError") {
        return res.status(400).json({
            message: "File upload error.",
            error: error.message,
            code: error.code,
        });
    }

    // -------------------------------------------------------
    // INVALID FILE TYPE
    // -------------------------------------------------------

    if (
        error &&
        error.message &&
        error.message.includes("Invalid file type")
    ) {
        return res.status(400).json({
            message: "Invalid attachment type.",
            error: error.message,
        });
    }

    // -------------------------------------------------------
    // POSTGRESQL ERROR
    // -------------------------------------------------------

    if (
        error &&
        (
            error.code ||
            error.severity ||
            error.detail ||
            error.constraint ||
            error.table
        )
    ) {
        return res.status(500).json({
            message: "Database error.",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "A database error occurred.",
            code: error.code || undefined,
            detail:
                process.env.NODE_ENV === "development"
                    ? error.detail
                    : undefined,
            constraint:
                process.env.NODE_ENV === "development"
                    ? error.constraint
                    : undefined,
        });
    }

    // -------------------------------------------------------
    // GENERAL SERVER ERROR
    // -------------------------------------------------------

    return res.status(500).json({
        message: "Internal server error.",
        error:
            process.env.NODE_ENV === "development"
                ? error.message
                : "An unexpected server error occurred.",
    });
});

// ===========================================================
// SERVER
// ===========================================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log("");
    console.log("==================================================");
    console.log("STAFF MONITORING API");
    console.log("==================================================");
    console.log(`Server running on port: ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`Database test: http://localhost:${PORT}/api/test-db`);
    console.log("==================================================");
    console.log("");
});

// ===========================================================
// SERVER ERROR HANDLING
// ===========================================================

server.on("error", (error) => {
    console.error("");
    console.error("==================================================");
    console.error("SERVER STARTUP ERROR");
    console.error("==================================================");

    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
        console.error(`Please stop the other server using port ${PORT}.`);
    } else {
        console.error(error);
    }

    console.error("==================================================");
});

// ===========================================================
// UNHANDLED PROMISE ERROR
// ===========================================================

process.on("unhandledRejection", (reason) => {
    console.error("");
    console.error("==================================================");
    console.error("UNHANDLED PROMISE REJECTION");
    console.error("==================================================");
    console.error(reason);
    console.error("==================================================");
});

// ===========================================================
// UNCAUGHT EXCEPTION
// ===========================================================

process.on("uncaughtException", (error) => {
    console.error("");
    console.error("==================================================");
    console.error("UNCAUGHT EXCEPTION");
    console.error("==================================================");
    console.error(error);
    console.error("==================================================");
});