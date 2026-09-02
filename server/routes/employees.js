const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// ==========================================
// GET ALL EMPLOYEES
// ==========================================
router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "hr", "manager"),
    async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.id,
                e.employee_id,
                e.first_name,
                e.last_name,
                e.email,
                e.phone,
                d.department_name,
                p.position_name,
                e.status,
                e.date_joined
            FROM employees e
            LEFT JOIN departments d
                ON e.department_id = d.id
            LEFT JOIN positions p
                ON e.position_id = p.id
            ORDER BY e.id ASC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Error getting employees:", error);

        res.status(500).json({
            message: "Failed to get employees",
            error: error.message,
        });
    }
});


// ==========================================
// GET ONE EMPLOYEE
// ==========================================
router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "hr", "manager"),
    async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                e.*,
                d.department_name,
                p.position_name
            FROM employees e
            LEFT JOIN departments d
                ON e.department_id = d.id
            LEFT JOIN positions p
                ON e.position_id = p.id
            WHERE e.id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Error getting employee:", error);

        res.status(500).json({
            message: "Failed to get employee",
            error: error.message,
        });
    }
});


// ==========================================
// ADD EMPLOYEE
// ==========================================
router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "hr"),
    async (req, res) => {
    try {
        const {
            employee_id,
            first_name,
            last_name,
            email,
            phone,
            department_id,
            position_id,
            status,
            date_joined,
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO employees
            (
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                department_id,
                position_id,
                status,
                date_joined
            )
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            `,
            [
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                department_id,
                position_id,
                status || "Active",
                date_joined,
            ]
        );

        res.status(201).json({
            message: "Employee added successfully",
            employee: result.rows[0],
        });

    } catch (error) {
        console.error("Error adding employee:", error);

        res.status(500).json({
            message: "Failed to add employee",
            error: error.message,
        });
    }
});


// ==========================================
// UPDATE EMPLOYEE
// ==========================================
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "hr"),
    async (req, res) => {
    try {
        const { id } = req.params;

        const {
            employee_id,
            first_name,
            last_name,
            email,
            phone,
            department_id,
            position_id,
            status,
            date_joined,
        } = req.body;

        const result = await pool.query(
            `
            UPDATE employees
            SET
                employee_id = $1,
                first_name = $2,
                last_name = $3,
                email = $4,
                phone = $5,
                department_id = $6,
                position_id = $7,
                status = $8,
                date_joined = $9
            WHERE id = $10
            RETURNING *
            `,
            [
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                department_id,
                position_id,
                status,
                date_joined,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        res.json({
            message: "Employee updated successfully",
            employee: result.rows[0],
        });

    } catch (error) {
        console.error("Error updating employee:", error);

        res.status(500).json({
            message: "Failed to update employee",
            error: error.message,
        });
    }
});


// ==========================================
// DELETE EMPLOYEE
// ==========================================
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            DELETE FROM employees
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        res.json({
            message: "Employee deleted successfully",
            employee: result.rows[0],
        });

    } catch (error) {
        console.error("Error deleting employee:", error);

        res.status(500).json({
            message: "Failed to delete employee",
            error: error.message,
        });
    }
});

module.exports = router;