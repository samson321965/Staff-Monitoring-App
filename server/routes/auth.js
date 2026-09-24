const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const serverPackage = require("../package.json");

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

        const loginUpdate = await pool.query(
            `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_login`,
            [user.id]
        );

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
                ,
                is_active: true,
                last_login: loginUpdate.rows[0]?.last_login || null
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

router.get("/me", authenticateToken, async (req, res) => {
    try {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS avatar_url TEXT
        `);

        await pool.query(`
            INSERT INTO system_settings (setting_key, setting_value, description)
            VALUES
                ('security_level', 'High', 'Default security level'),
                ('system_version', 'v1.0.0', 'Application release version')
            ON CONFLICT (setting_key) DO NOTHING
        `);

        const result = await pool.query(`
            SELECT
                u.id,
                u.username,
                u.email,
                u.employee_id,
                u.is_active,
                u.last_login,
                u.password_changed_at,
                u.avatar_url,
                r.role_name
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const settingsResult = await pool.query(`
            SELECT setting_key, setting_value
            FROM system_settings
            WHERE setting_key IN ('security_level', 'system_version')
        `);

        const systemSettings = Object.fromEntries(
            settingsResult.rows.map((setting) => [
                setting.setting_key,
                setting.setting_value,
            ])
        );

        const user = result.rows[0];
        const highSecurityRoles = ["system_admin", "director", "deputy_director", "manager"];

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            employee_id: user.employee_id,
            role: user.role_name,
            accountStatus: user.is_active ? "Active" : "Disabled",
            lastLogin: user.last_login,
            securityLevel: systemSettings.security_level || (
                highSecurityRoles.includes(user.role_name)
                    ? "High"
                    : "Standard"
            ),
            passwordChangedAt: user.password_changed_at,
            avatarUrl: user.avatar_url,
            systemVersion: systemSettings.system_version || `v${serverPackage.version}`,
        });
    } catch (error) {
        console.error("Profile lookup error:", error);
        res.status(500).json({ message: "Unable to load account status." });
    }
});

router.put("/profile", authenticateToken, async (req, res) => {
    try {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS avatar_url TEXT
        `);

        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const avatarUrl = req.body.avatarUrl || null;

        if (!username || !email) {
            return res.status(400).json({
                message: "Username and email address are required.",
            });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address.",
            });
        }

        if (avatarUrl && (!String(avatarUrl).startsWith("data:image/") || String(avatarUrl).length > 2_000_000)) {
            return res.status(400).json({
                message: "Profile picture must be an image smaller than 1.5 MB.",
            });
        }

        const result = await pool.query(`
            UPDATE users
            SET username = $1,
                email = $2,
                avatar_url = $3
            WHERE id = $4
            RETURNING id, username, email, employee_id, avatar_url
        `, [username, email, avatarUrl, req.user.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({
            message: "Profile updated successfully.",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Profile update error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "That username or email is already in use.",
            });
        }

        res.status(500).json({ message: "Unable to update profile." });
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