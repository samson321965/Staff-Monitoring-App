const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error(
            "JWT_SECRET is not configured. Check server/.env"
        );
    }

    return secret;
};

// ==================================================
// LOGIN
// POST /api/auth/login
// ==================================================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            `
            SELECT
                u.id,
                u.employee_id,
                u.username,
                u.email,
                u.password_hash,
                u.is_active,
                r.role_name
            FROM users u
            INNER JOIN roles r
                ON u.role_id = r.id
            WHERE LOWER(u.email) = LOWER($1)
            `,
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                message: "Account is disabled"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                employee_id: user.employee_id,
                email: user.email,
                role: user.role_name
            },
            getJwtSecret(),
            {
                expiresIn: "8h"
            }
        );

        return res.status(200).json({
            message: "Login successful",

            token,

            user: {
                id: user.id,
                employee_id: user.employee_id,
                username: user.username,
                email: user.email,
                role: user.role_name
            }
        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            message: "Server error during login",
            error: error.message
        });

    }
});

// ==================================================
// CHANGE PASSWORD
// PUT /api/auth/change-password
// ==================================================

router.put(
    "/change-password",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                currentPassword,
                newPassword
            } = req.body;

            if (
                !currentPassword ||
                !newPassword
            ) {
                return res.status(400).json({
                    message:
                        "Current password and new password are required"
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    message:
                        "New password must be at least 8 characters long"
                });
            }

            const userId = req.user.id;

            const result = await pool.query(
                `
                SELECT
                    id,
                    password_hash,
                    is_active
                FROM users
                WHERE id = $1
                `,
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const user = result.rows[0];

            if (!user.is_active) {
                return res.status(403).json({
                    message:
                        "This account has been disabled"
                });
            }

            const validPassword =
                await bcrypt.compare(
                    currentPassword,
                    user.password_hash
                );

            if (!validPassword) {
                return res.status(401).json({
                    message:
                        "Current password is incorrect"
                });
            }

            const samePassword =
                await bcrypt.compare(
                    newPassword,
                    user.password_hash
                );

            if (samePassword) {
                return res.status(400).json({
                    message:
                        "New password must be different from current password"
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            await pool.query(
                `
                UPDATE users
                SET
                    password_hash = $1,
                    password_changed_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    hashedPassword,
                    userId
                ]
            );

            return res.status(200).json({
                message:
                    "Password updated successfully"
            });

        } catch (error) {

            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({
                message:
                    "Server error while changing password"
            });

        }

    }
);

module.exports = router;