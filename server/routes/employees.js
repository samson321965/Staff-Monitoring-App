const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");


// ======================================================
// GET ALL EMPLOYEES
// ======================================================
router.get(
    "/",
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
        "officer",
        "employee"
    ),
    async (req, res) => {
        try {

            const result = await pool.query(`
                SELECT
                    e.id,
                    e.employee_code,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.phone,

                    p.id AS position_id,
                    p.position_name,

                    s.id AS section_id,
                    s.section_name,

                    d.id AS department_id,
                    d.department_name,

                    e.manager_id,
                    e.employment_status,
                    e.date_joined,
                    e.created_at,
                    e.updated_at

                FROM employees e

                LEFT JOIN positions p
                    ON e.position_id = p.id

                LEFT JOIN sections s
                    ON p.section_id = s.id

                LEFT JOIN departments d
                    ON s.department_id = d.id

                ORDER BY e.id ASC
            `);

            res.json(result.rows);

        } catch (error) {

            console.error("Error getting employees:", error);

            res.status(500).json({
                message: "Failed to get employees",
                error: error.message
            });
        }
    }
);


// ======================================================
// GET ONE EMPLOYEE
// ======================================================
router.get(
    "/:id",
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
        "officer",
        "employee"
    ),
    async (req, res) => {

        try {

            const { id } = req.params;

            const result = await pool.query(
                `
                SELECT
                    e.id,
                    e.employee_code,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.phone,

                    p.id AS position_id,
                    p.position_name,

                    s.id AS section_id,
                    s.section_name,

                    d.id AS department_id,
                    d.department_name,

                    e.manager_id,
                    e.employment_status,
                    e.date_joined,
                    e.created_at,
                    e.updated_at

                FROM employees e

                LEFT JOIN positions p
                    ON e.position_id = p.id

                LEFT JOIN sections s
                    ON p.section_id = s.id

                LEFT JOIN departments d
                    ON s.department_id = d.id

                WHERE e.id = $1
                `,
                [id]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Employee not found"
                });

            }

            res.json(result.rows[0]);

        } catch (error) {

            console.error("Error getting employee:", error);

            res.status(500).json({
                message: "Failed to get employee",
                error: error.message
            });
        }
    }
);


// ======================================================
// ADD EMPLOYEE
// ======================================================
router.post(
    "/",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "hr"
    ),
    async (req, res) => {

        try {

            const {
                employee_code,
                first_name,
                last_name,
                email,
                phone,
                position_id,
                manager_id,
                employment_status,
                date_joined
            } = req.body;


            // Basic validation
            if (
                !employee_code ||
                !first_name ||
                !last_name ||
                !email ||
                !position_id
            ) {

                return res.status(400).json({
                    message:
                        "Employee code, first name, last name, email and position are required"
                });

            }


            const result = await pool.query(
                `
                INSERT INTO employees
                (
                    employee_code,
                    first_name,
                    last_name,
                    email,
                    phone,
                    position_id,
                    manager_id,
                    employment_status,
                    date_joined
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
                    $8,
                    $9
                )

                RETURNING *
                `,
                [
                    employee_code,
                    first_name,
                    last_name,
                    email,
                    phone || null,
                    position_id,
                    manager_id || null,
                    employment_status || "Active",
                    date_joined || null
                ]
            );


            res.status(201).json({
                message: "Employee added successfully",
                employee: result.rows[0]
            });

        } catch (error) {

            console.error("Error adding employee:", error);

            // Duplicate employee code or email
            if (error.code === "23505") {

                return res.status(409).json({
                    message:
                        "Employee code or email already exists",
                    error: error.detail
                });

            }

            // Foreign key error
            if (error.code === "23503") {

                return res.status(400).json({
                    message:
                        "Invalid position or manager selected",
                    error: error.detail
                });

            }

            res.status(500).json({
                message: "Failed to add employee",
                error: error.message
            });
        }
    }
);


// ======================================================
// UPDATE EMPLOYEE
// ======================================================
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "system_admin",
        "hr"
    ),
    async (req, res) => {

        try {

            const { id } = req.params;

            const {
                employee_code,
                first_name,
                last_name,
                email,
                phone,
                position_id,
                manager_id,
                employment_status,
                date_joined
            } = req.body;


            const result = await pool.query(
                `
                UPDATE employees

                SET
                    employee_code = $1,
                    first_name = $2,
                    last_name = $3,
                    email = $4,
                    phone = $5,
                    position_id = $6,
                    manager_id = $7,
                    employment_status = $8,
                    date_joined = $9

                WHERE id = $10

                RETURNING *
                `,
                [
                    employee_code,
                    first_name,
                    last_name,
                    email,
                    phone || null,
                    position_id,
                    manager_id || null,
                    employment_status,
                    date_joined,
                    id
                ]
            );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Employee not found"
                });

            }


            res.json({
                message: "Employee updated successfully",
                employee: result.rows[0]
            });

        } catch (error) {

            console.error("Error updating employee:", error);

            if (error.code === "23505") {

                return res.status(409).json({
                    message:
                        "Employee code or email already exists",
                    error: error.detail
                });

            }

            if (error.code === "23503") {

                return res.status(400).json({
                    message:
                        "Invalid position or manager selected",
                    error: error.detail
                });

            }

            res.status(500).json({
                message: "Failed to update employee",
                error: error.message
            });
        }
    }
);


// ======================================================
// DELETE EMPLOYEE
// ======================================================
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "system_admin"
    ),
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
                    message: "Employee not found"
                });

            }


            res.json({
                message: "Employee deleted successfully",
                employee: result.rows[0]
            });

        } catch (error) {

            console.error("Error deleting employee:", error);

            res.status(500).json({
                message: "Failed to delete employee",
                error: error.message
            });
        }
    }
);


module.exports = router;

