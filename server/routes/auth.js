const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured. Check server/.env");
    }

    return secret;
};


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
                message:
                    "Email and password are required",
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
                message:
                    "Invalid email or password",
            });

        }


        const user = result.rows[0];


        // ==========================================
        // CHECK ACCOUNT STATUS
        // ==========================================

        if (!user.is_active) {

            return res.status(403).json({
                message:
                    "This account has been disabled",
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

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({
                message:
                    "Invalid email or password",
            });

        }


        // ==========================================
        // CREATE JWT TOKEN
        // ==========================================

        const token = jwt.sign(

            {

                id: user.id,

                employee_id:
                    user.employee_id,

                email:
                    user.email,

                role:
                    user.role,

            },

            getJwtSecret(),

            {

                expiresIn: "8h",

            }

        );


        // ==========================================
        // SEND LOGIN RESPONSE
        // ==========================================

        res.status(200).json({

            message:
                "Login successful",

            token,

            user: {

                id:
                    user.id,

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


// ==========================================
// CHANGE PASSWORD
// PUT /api/auth/change-password
// ==========================================

router.put(
    "/change-password",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                currentPassword,
                newPassword,
            } = req.body;


            // ==========================================
            // VALIDATE INPUT
            // ==========================================

            if (
                !currentPassword ||
                !newPassword
            ) {

                return res.status(400).json({

                    message:
                        "Current password and new password are required",

                });

            }


            // ==========================================
            // PASSWORD LENGTH
            // ==========================================

            if (newPassword.length < 8) {

                return res.status(400).json({

                    message:
                        "New password must be at least 8 characters long",

                });

            }


            // ==========================================
            // GET USER ID FROM JWT
            // ==========================================

            const userId = req.user.id;


            // ==========================================
            // FIND USER
            // ==========================================

            const result = await pool.query(

                `
                SELECT
                    id,
                    password,
                    is_active
                FROM users
                WHERE id = $1
                `,

                [userId]

            );


            // ==========================================
            // USER NOT FOUND
            // ==========================================

            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    message:
                        "User not found",

                });

            }


            const user = result.rows[0];


            // ==========================================
            // CHECK ACCOUNT STATUS
            // ==========================================

            if (!user.is_active) {

                return res.status(403).json({

                    message:
                        "This account has been disabled",

                });

            }


            // ==========================================
            // VERIFY CURRENT PASSWORD
            // ==========================================

            const validPassword =
                await bcrypt.compare(

                    currentPassword,

                    user.password

                );


            if (!validPassword) {

                return res.status(401).json({

                    message:
                        "Current password is incorrect",

                });

            }


            // ==========================================
            // MAKE SURE PASSWORD IS DIFFERENT
            // ==========================================

            const samePassword =
                await bcrypt.compare(

                    newPassword,

                    user.password

                );


            if (samePassword) {

                return res.status(400).json({

                    message:
                        "New password must be different from your current password",

                });

            }


            // ==========================================
            // HASH NEW PASSWORD
            // ==========================================

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );


            // ==========================================
            // UPDATE DATABASE
            // ==========================================

            await pool.query(

                `
                UPDATE users
                SET password = $1
                WHERE id = $2
                `,

                [
                    hashedPassword,
                    userId,
                ]

            );


            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({

                message:
                    "Password updated successfully",

            });

        } catch (error) {

            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({

                message:
                    "Server error while changing password",

            });

        }

    }
);


module.exports = router;

