const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// GET TODAY DATE - INDIA TIME
// ======================================================

function getTodayDate() {
    const now = new Date();

    const indiaDate = new Date(
        now.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        })
    );

    const year = indiaDate.getFullYear();

    const month = String(
        indiaDate.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        indiaDate.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// ======================================================
// GET ALL TASKS
// ======================================================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                user_id,
                title,
                completed,
                task_date::text AS task_date,
                completed_date::text AS completed_date,
                reminder_enabled,
                reminder_time,
                created_at,
                updated_at
            FROM tasks
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [req.userId]
        );

        console.log("DATABASE TASKS:", result.rows);

        res.json(result.rows);

    } catch (error) {

        console.error("Get tasks error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// ADD TASK
// ======================================================

router.post("/", authMiddleware, async (req, res) => {

    try {

        const { title } = req.body;

        if (!title || title.trim() === "") {

            return res.status(400).json({
                message: "Task title is required"
            });
        }

        const today = getTodayDate();

        const result = await pool.query(
            `
            INSERT INTO tasks
            (
                user_id,
                title,
                completed,
                task_date,
                completed_date,
                reminder_enabled,
                reminder_time
            )
            VALUES
            ($1, $2, false, $3, NULL, false, NULL)

            RETURNING
                id,
                user_id,
                title,
                completed,
                task_date::text AS task_date,
                completed_date::text AS completed_date,
                reminder_enabled,
                reminder_time,
                created_at,
                updated_at
            `,
            [
                req.userId,
                title.trim(),
                today
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.error("Add task error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// COMPLETE / UNCOMPLETE TASK
// ======================================================

router.put("/:id", authMiddleware, async (req, res) => {

    try {

        const taskId = req.params.id;

        // Check task
        const findResult = await pool.query(
            `
            SELECT *
            FROM tasks
            WHERE id = $1
            AND user_id = $2
            `,
            [
                taskId,
                req.userId
            ]
        );

        if (findResult.rows.length === 0) {

            return res.status(404).json({
                message: "Task not found"
            });
        }

        const task = findResult.rows[0];

        const newCompleted = !task.completed;

        const completedDate = newCompleted
            ? getTodayDate()
            : null;

        const result = await pool.query(
            `
            UPDATE tasks
            SET
                completed = $1,
                completed_date = $2,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $3
            AND user_id = $4

            RETURNING
                id,
                user_id,
                title,
                completed,
                task_date::text AS task_date,
                completed_date::text AS completed_date,
                reminder_enabled,
                reminder_time,
                created_at,
                updated_at
            `,
            [
                newCompleted,
                completedDate,
                taskId,
                req.userId
            ]
        );

        res.json(result.rows[0]);

    } catch (error) {

        console.error("Update task error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// DELETE TASK
// ======================================================

router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        const result = await pool.query(
            `
            DELETE FROM tasks
            WHERE id = $1
            AND user_id = $2
            RETURNING id
            `,
            [
                req.params.id,
                req.userId
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully"
        });

    } catch (error) {

        console.error("Delete task error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// ======================================================
// STREAK
// ======================================================

router.get("/streak", authMiddleware, async (req, res) => {

    try {

        // Get today's date
        const today = getTodayDate();

        /*
         * Get every day on which the user has created tasks.
         *
         * For each day:
         * total_tasks     = number of tasks created
         * completed_tasks = number of completed tasks
         */
        const result = await pool.query(
            `
            SELECT
                task_date::text AS task_date,

                COUNT(*) AS total_tasks,

                COUNT(*) FILTER (
                    WHERE completed = true
                ) AS completed_tasks

            FROM tasks

            WHERE user_id = $1

            GROUP BY task_date

            ORDER BY task_date DESC
            `,
            [req.userId]
        );

        console.log("STREAK DATA:", result.rows);

        let streak = 0;

        // Start checking from today
        let currentDate = today;

        /*
         * Keep checking previous days.
         *
         * A day counts only when:
         *
         * total_tasks === completed_tasks
         */
        while (true) {

            const dayData = result.rows.find(
                row => row.task_date === currentDate
            );

            // No tasks created on this day
            if (!dayData) {
                break;
            }

            const totalTasks =
                Number(dayData.total_tasks);

            const completedTasks =
                Number(dayData.completed_tasks);

            console.log(
                currentDate,
                "Total:",
                totalTasks,
                "Completed:",
                completedTasks
            );

            // ALL tasks must be completed
            if (
                totalTasks > 0 &&
                totalTasks === completedTasks
            ) {

                streak++;

            } else {

                // One incomplete task breaks the streak
                break;
            }

            // Move to previous day
            const date = new Date(
                currentDate + "T00:00:00"
            );

            date.setDate(
                date.getDate() - 1
            );

            const year =
                date.getFullYear();

            const month =
                String(date.getMonth() + 1)
                    .padStart(2, "0");

            const day =
                String(date.getDate())
                    .padStart(2, "0");

            currentDate =
                `${year}-${month}-${day}`;
        }

        console.log(
            "FINAL STREAK:",
            streak
        );

        res.json({
            streak
        });

    } catch (error) {

        console.error(
            "Streak error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
});
// ======================================================
// HISTORY
// ======================================================

router.get("/history", authMiddleware, async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                completed_date::text AS completed_date,
                COUNT(*) AS count

            FROM tasks

            WHERE user_id = $1
            AND completed = true
            AND completed_date IS NOT NULL

            GROUP BY completed_date

            ORDER BY completed_date ASC
            `,
            [req.userId]
        );

        res.json(result.rows);

    } catch (error) {

        console.error("History error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// SET / REMOVE REMINDER
// ======================================================

router.put("/:id/reminder", authMiddleware, async (req, res) => {

    try {

        const {
            reminderEnabled,
            reminderTime
        } = req.body;

        if (
            reminderEnabled &&
            reminderTime
        ) {

            const timePattern =
                /^([01]\d|2[0-3]):([0-5]\d)$/;

            if (!timePattern.test(reminderTime)) {

                return res.status(400).json({
                    message: "Invalid reminder time"
                });
            }
        }

        const result = await pool.query(
            `
            UPDATE tasks

            SET
                reminder_enabled = $1,
                reminder_time = $2,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $3
            AND user_id = $4

            RETURNING
                id,
                user_id,
                title,
                completed,
                task_date::text AS task_date,
                completed_date::text AS completed_date,
                reminder_enabled,
                reminder_time,
                created_at,
                updated_at
            `,
            [
                reminderEnabled || false,

                reminderEnabled
                    ? reminderTime
                    : null,

                req.params.id,

                req.userId
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error("Reminder error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


module.exports = router;