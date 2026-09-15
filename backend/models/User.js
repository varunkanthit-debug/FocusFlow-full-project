const pool = require("../config/db");

const User = {
    async findByEmail(email) {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        return result.rows[0];
    },

    async create(name, email, password) {
        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, password]
        );

        return result.rows[0];
    }
};

module.exports = User;