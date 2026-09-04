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


        // ==========================================
        // VALIDATE INPUT
        // ==========================================

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }


        // ==========================================
        // FIND USER
        // ==========================================

        const result = await pool.query(
            `
            SELECT
                id,
                employee_id,
                username,
                email,
                password,
                role,
                is_active
            FROM users
            WHERE LOWER(email) = LOWER($1)
            `,
            [email.trim()]
        );


        // ==========================================
        // USER NOT FOUND
        // ==========================================

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }


        const user = result.rows[0];


        // ==========================================
        // CHECK ACCOUNT STATUS
        // ==========================================

        if (!user.is_active) {
            return res.status(403).json({
                message: "This account has been disabled",
            });
        }


        // ==========================================
        // CHECK USER ROLE
        // ==========================================

        const allowedRoles = [
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


        if (!allowedRoles.includes(user.role)) {
            console.error(
                `Invalid role "${user.role}" for user ${user.email}`
            );

            return res.status(403).json({
                message:
                    "Your account has an invalid system role. Please contact the system administrator.",
            });
        }


        // ==========================================
        // COMPARE PASSWORD
        // ==========================================

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }


        // ==========================================
        // CREATE JWT TOKEN
        // ==========================================

        const token = jwt.sign(
            {
                id: user.id,

                employee_id: user.employee_id,

                email: user.email,

                role: user.role,
            },

            process.env.JWT_SECRET ||
                "staff_monitor_secret",

            {
                expiresIn: "8h",
            }
        );


        // ==========================================
        // SEND LOGIN RESPONSE
        // ==========================================

        res.status(200).json({

            message: "Login successful",

            token,

            user: {
                id: user.id,

                employee_id:
                    user.employee_id,

                username:
                    user.username,

                email:
                    user.email,

                role:
                    user.role,
            },
        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        res.status(500).json({

            message:
                "Server error during login",

            error:
                error.message,
        });
    }
});


module.exports = router;