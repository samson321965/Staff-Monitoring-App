const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");

const router = express.Router();


// ==========================================
// LOGIN USER
// POST /api/auth/login
// ==========================================
router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;


        // Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }


        // Find user
        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );


        // User not found
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }


        const user = result.rows[0];


        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({
                message: "This account has been disabled"
            });
        }


        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }


        // Create JWT token
        const token = jwt.sign(
            {
                id: user.id,
                employee_id: user.employee_id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET || "staff_monitor_secret",
            {
                expiresIn: "8h"
            }
        );


        // Send response
        res.json({
            message: "Login successful",
            token,

            user: {
                id: user.id,
                employee_id: user.employee_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });


    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error during login",
            error: error.message
        });

    }
});


module.exports = router;