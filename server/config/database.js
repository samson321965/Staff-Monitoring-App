const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
});

pool.connect()
    .then((client) => {
        console.log("PostgreSQL Connected Successfully!");
        client.release();
    })
    .catch((err) => {
        console.error("PostgreSQL Connection Error:", err.message);
    });

module.exports = pool;