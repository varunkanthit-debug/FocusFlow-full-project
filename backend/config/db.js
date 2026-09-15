const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("connect", () => {
    console.log("Connected to Neon PostgreSQL");
});

pool.on("error", (error) => {
    console.error("PostgreSQL error:", error);
});

module.exports = pool;