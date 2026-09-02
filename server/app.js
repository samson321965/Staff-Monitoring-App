const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");
const employeeRoutes = require("./routes/employees");
const leaveRoutes = require("./routes/leaves");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const reportRoutes = require("./routes/report");
const authRoutes = require("./routes/auth");
const departmentsRoutes = require("./routes/departments");
const positionsRoutes = require("./routes/positions");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/positions", positionsRoutes);
// Home route
app.get("/", (req, res) => {
    res.send("Staff Monitoring API is Running...");
});

// Test database route
app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connection successful!",
            time: result.rows[0].now,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message,
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});