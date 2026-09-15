const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        completed: {
            type: Boolean,
            default: false
        },

        taskDate: {
            type: String,
            required: true
        },

        completedDate: {
            type: String,
            default: null
        },

        // Reminder settings
        reminderEnabled: {
            type: Boolean,
            default: false
        },

        reminderTime: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;