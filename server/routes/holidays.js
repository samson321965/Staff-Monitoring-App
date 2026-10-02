const express = require("express");
const pool = require("../config/database");
const {
    ensurePublicHolidaySchema,
    getActivePublicHolidays,
} = require("../publicHolidays");
const {
    authenticateToken,
    authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

const VIEW_ROLES = [
    "system_admin",
    "commission",
    "director",
    "deputy_director",
    "manager",
    "hr",
    "finance",
    "compliance",
    "ict_officer",
    "officer",
    "employee",
];

const MANAGE_ROLES = ["system_admin", "hr"];

router.get(
    "/",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        try {
            res.json(await getActivePublicHolidays());
        } catch (error) {
            console.error("Load public holidays error:", error);
            res.status(500).json({ message: "Unable to load public holidays." });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        const { date, name } = req.body;
        const holidayName = String(name || "").trim();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !holidayName || holidayName.length > 150) {
            return res.status(400).json({ message: "Enter a valid holiday date and a name up to 150 characters." });
        }

        try {
            await ensurePublicHolidaySchema();
            const result = await pool.query(`
                INSERT INTO public_holidays (holiday_date, holiday_name, holiday_type, is_active)
                VALUES ($1::date, $2, 'Manual', TRUE)
                RETURNING
                    id,
                    TO_CHAR(holiday_date, 'YYYY-MM-DD') AS date,
                    holiday_name AS name,
                    holiday_type AS source,
                    LOWER(holiday_type) = 'national' AS "isGenerated"
            `, [date, holidayName]);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({ message: "A public holiday already exists on that date." });
            }

            if (error.code === "22008" || error.code === "22007") {
                return res.status(400).json({ message: "Enter a valid holiday date." });
            }

            console.error("Create public holiday error:", error);
            res.status(500).json({ message: "Unable to save the public holiday." });
        }
    }
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles(...MANAGE_ROLES),
    async (req, res) => {
        if (!/^\d+$/.test(req.params.id)) {
            return res.status(400).json({ message: "Invalid public holiday ID." });
        }

        try {
            await ensurePublicHolidaySchema();
            const result = await pool.query(`
                UPDATE public_holidays
                SET is_active = FALSE
                WHERE id = $1 AND is_active = TRUE
                RETURNING id
            `, [req.params.id]);

            if (result.rowCount === 0) {
                return res.status(404).json({ message: "Public holiday not found." });
            }

            res.json({ message: "Public holiday removed." });
        } catch (error) {
            console.error("Remove public holiday error:", error);
            res.status(500).json({ message: "Unable to remove the public holiday." });
        }
    }
);

module.exports = router;