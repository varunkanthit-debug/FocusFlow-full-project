const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config(); 

const pool = require("./config/db");

const authRoutes = require("./routes/auth");
const loginRoutes = require("./routes/login");
const taskRoutes = require("./routes/tasks");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Test PostgreSQL connection
pool.query("SELECT NOW()")
    .then(() => {

        console.log("PostgreSQL connected successfully");

        // Authentication routes
        app.use("/api/auth", authRoutes);
        app.use("/api/auth", loginRoutes);

        // Task routes
        app.use("/api/tasks", taskRoutes);

        // Start server
        app.listen(process.env.PORT || 5000, () => {

            console.log(
                `Server running on http://localhost:${process.env.PORT || 5000}`
            );

        });

    })
    .catch((error) => {

        console.log("PostgreSQL connection failed:");
        console.log(error);

    });