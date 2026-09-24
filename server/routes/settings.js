const express = require("express");

const pool = require("../config/database");
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

const EDIT_ROLES = ["system_admin"];
const REGIONAL_KEYS = ["time_zone", "date_format", "time_format", "currency", "language"];

const ensureRegionalSettings = async () => {
    await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES
            ('time_zone', 'Pacific/Efate (UTC+11:00)', 'Default time zone'),
            ('date_format', 'DD/MM/YYYY', 'Default date format'),
            ('time_format', '12-hour (AM/PM)', 'Default time format'),
            ('currency', 'Vanuatu Vatu (VUV)', 'Default currency'),
            ('language', 'English', 'Default language')
        ON CONFLICT (setting_key) DO NOTHING
    `);
};

router.get(
    "/regional",
    authenticateToken,
    authorizeRoles(...VIEW_ROLES),
    async (req, res) => {
        let client;

        try {
            await ensureRegionalSettings();
            const result = await pool.query(`
                SELECT setting_key, setting_value
                FROM system_settings
                WHERE setting_key = ANY($1::text[])
            `, [REGIONAL_KEYS]);

            res.json(Object.fromEntries(result.rows.map((row) => [row.setting_key, row.setting_value])));
        } catch (error) {
            console.error("Regional settings error:", error);
            res.status(500).json({ message: "Unable to load regional settings." });
        }
    }
);

router.put(
    "/regional",
    authenticateToken,
    authorizeRoles(...EDIT_ROLES),
    async (req, res) => {
        try {
            await ensureRegionalSettings();
            const values = {
                time_zone: req.body.timeZone,
                date_format: req.body.dateFormat,
                time_format: req.body.timeFormat,
                currency: req.body.currency,
                language: req.body.language,
            };

            if (Object.values(values).some((value) => !String(value || "").trim())) {
                return res.status(400).json({ message: "All regional settings are required." });
            }

            client = await pool.connect();
            await client.query("BEGIN");
            for (const key of REGIONAL_KEYS) {
                await client.query(`
                    UPDATE system_settings
                    SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE setting_key = $2
                `, [String(values[key]).trim(), key]);
            }
            await client.query("COMMIT");

            res.json({ message: "Regional settings saved successfully." });
        } catch (error) {
            await client?.query("ROLLBACK").catch(() => {});
            console.error("Save regional settings error:", error);
            res.status(500).json({ message: "Unable to save regional settings." });
        } finally {
            client?.release();
        }
    }
);

module.exports = router;
