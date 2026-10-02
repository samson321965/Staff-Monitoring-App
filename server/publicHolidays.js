const pool = require("./config/database");

let schemaReadyPromise = null;

const dateToISO = (date) => date.toISOString().slice(0, 10);

const getEasterSunday = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(Date.UTC(year, month - 1, day));
};

const getVanuatuPublicHolidays = (year) => {
    const fixedHolidays = [
        [1, 1, "New Year's Day"],
        [2, 21, "Father Walter Lini Day"],
        [3, 5, "Custom Chiefs' Day"],
        [5, 1, "Labour Day"],
        [7, 24, "Children's Day"],
        [7, 30, "Independence Day"],
        [8, 15, "Assumption Day"],
        [10, 5, "Constitution Day"],
        [11, 29, "Unity Day"],
        [12, 25, "Christmas Day"],
        [12, 26, "Family Day"],
    ].map(([month, day, name]) => ({
        date: dateToISO(new Date(Date.UTC(year, month - 1, day))),
        name,
    }));

    const easterSunday = getEasterSunday(year);
    const goodFriday = new Date(easterSunday);
    goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
    const easterMonday = new Date(easterSunday);
    easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
    const ascensionDay = new Date(easterSunday);
    ascensionDay.setUTCDate(ascensionDay.getUTCDate() + 39);

    return [
        ...fixedHolidays,
        { date: dateToISO(goodFriday), name: "Good Friday" },
        { date: dateToISO(easterMonday), name: "Easter Monday" },
        { date: dateToISO(ascensionDay), name: "Ascension Day" },
    ].sort((left, right) => left.date.localeCompare(right.date));
};

const ensurePublicHolidaySchema = async () => {
    if (!schemaReadyPromise) {
        schemaReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS public_holidays (
                    id BIGSERIAL PRIMARY KEY,
                    holiday_date DATE NOT NULL UNIQUE,
                    holiday_name VARCHAR(150) NOT NULL,
                    holiday_type VARCHAR(50) NOT NULL DEFAULT 'National',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);

            const currentYear = new Date().getFullYear();
            const seededHolidays = [];

            for (let year = currentYear - 1; year <= currentYear + 5; year += 1) {
                seededHolidays.push(...getVanuatuPublicHolidays(year));
            }

            await pool.query(`
                INSERT INTO public_holidays (
                    holiday_date,
                    holiday_name,
                    holiday_type,
                    is_active
                )
                SELECT
                    seeded.holiday_date::date,
                    seeded.name,
                    'National',
                    TRUE
                FROM unnest($1::text[], $2::text[]) AS seeded(holiday_date, name)
                ON CONFLICT (holiday_date) DO NOTHING
            `, [
                seededHolidays.map((holiday) => holiday.date),
                seededHolidays.map((holiday) => holiday.name),
            ]);
        })().catch((error) => {
            schemaReadyPromise = null;
            throw error;
        });
    }

    return schemaReadyPromise;
};

const getActivePublicHolidays = async () => {
    await ensurePublicHolidaySchema();

    const result = await pool.query(`
        SELECT
            id,
            TO_CHAR(holiday_date, 'YYYY-MM-DD') AS date,
            holiday_name AS name,
            holiday_type AS source,
            LOWER(holiday_type) = 'national' AS "isGenerated"
        FROM public_holidays
        WHERE is_active = TRUE
        ORDER BY holiday_date
    `);

    return result.rows;
};

const calculateWorkingDays = (startDate, endDate, holidayDates = new Set()) => {
    const parseDate = (value) => {
        let year;
        let month;
        let day;

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            year = value.getFullYear();
            month = value.getMonth() + 1;
            day = value.getDate();
        } else {
            [year, month, day] = String(value || "")
                .slice(0, 10)
                .split("-")
                .map(Number);
        }

        if (!year || !month || !day) {
            return null;
        }

        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return null;
        }

        return date;
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end || end < start) {
        return 0;
    }

    let workingDays = 0;
    const current = new Date(start);

    while (current <= end) {
        const date = dateToISO(current);
        const weekday = current.getUTCDay();

        if (weekday !== 0 && weekday !== 6 && !holidayDates.has(date)) {
            workingDays += 1;
        }

        current.setUTCDate(current.getUTCDate() + 1);
    }

    return workingDays;
};

module.exports = {
    calculateWorkingDays,
    ensurePublicHolidaySchema,
    getActivePublicHolidays,
};