const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../config/database");
const {
    authenticateToken,
    authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const ADMIN_ROLES = ["system_admin"];

router.use(authenticateToken, authorizeRoles(...ADMIN_ROLES));

router.get("/users", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id,
                u.username,
                u.email,
                u.employee_id,
                u.is_active AS "isActive",
                u.last_login AS "lastLogin",
                u.created_at AS "createdAt",
                r.id AS "roleId",
                r.role_name AS role
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            ORDER BY u.username ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Admin users error:", error);
        res.status(500).json({ message: "Unable to load users." });
    }
});

router.get("/access-control", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                r.id,
                r.role_name AS role,
                r.description,
                COUNT(rp.permission_id)::int AS "permissionCount",
                COALESCE(
                    ARRAY_AGG(p.permission_name ORDER BY p.permission_name)
                    FILTER (WHERE p.permission_name IS NOT NULL),
                    ARRAY[]::varchar[]
                ) AS permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            LEFT JOIN permissions p ON p.id = rp.permission_id
            GROUP BY r.id
            ORDER BY r.role_name ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Access control error:", error);
        res.status(500).json({ message: "Unable to load access control." });
    }
});

router.post("/users", async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            roleId,
            employeeId,
        } = req.body;

        if (!username?.trim() || !email?.trim() || !password || !roleId) {
            return res.status(400).json({
                message: "Username, email, password, and role are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long.",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(`
            INSERT INTO users (
                username,
                email,
                password_hash,
                role_id,
                employee_id,
                is_active
            )
            VALUES ($1, LOWER($2), $3, $4, $5, TRUE)
            RETURNING id, username, email, employee_id, is_active AS "isActive"
        `, [
            username.trim(),
            email.trim(),
            passwordHash,
            roleId,
            employeeId || null,
        ]);

        res.status(201).json({
            message: "User created successfully.",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Create admin user error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Username, email, or employee ID already exists.",
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                message: "The selected role or employee does not exist.",
            });
        }

        res.status(500).json({ message: "Unable to create user." });
    }
});

router.patch("/users/:id/status", async (req, res) => {
    try {
        const result = await pool.query(`
            UPDATE users
            SET is_active = $1
            WHERE id = $2
            RETURNING id, is_active AS "isActive"
        `, [Boolean(req.body.isActive), req.params.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({ message: "User status updated.", user: result.rows[0] });
    } catch (error) {
        console.error("Update user status error:", error);
        res.status(500).json({ message: "Unable to update user status." });
    }
});

module.exports = router;
