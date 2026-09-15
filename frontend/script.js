// ======================================================
// FOCUSFLOW - STUDENT PRODUCTIVITY TRACKER
// PostgreSQL Compatible Frontend
// ======================================================


// ======================================================
// GLOBAL VARIABLES
// ======================================================

const taskList = document.getElementById("taskList");

let chart = null;

let timeLeft = 25 * 60;

let timerInterval = null;


// ======================================================
// API URL
// ======================================================

const API_URL = "https://focusflow-backend-eu47.onrender.com";


// ======================================================
// PAGE LOAD
// ======================================================

window.onload = function () {

    const token = localStorage.getItem("token");

    if (!token) {

        showFocusFlowPopup("Please login first!");

        setTimeout(function () {

            window.location.href = "login.html";

        }, 1500);

        return;
    }

    displayUserName();

    loadTasks();

    // Dark mode
    if (
        localStorage.getItem("darkMode") === "enabled"
    ) {

        document.body.classList.add("dark-mode");

    }

    requestNotificationPermission();

    // Check reminders every 30 seconds
    setInterval(checkReminders, 30000);

    updateTimerDisplay();
};


// ======================================================
// CUSTOM POPUP
// ======================================================

function showFocusFlowPopup(message) {

    const popup =
        document.getElementById("focusflowPopup");

    const popupMessage =
        document.getElementById("popupMessage");

    if (!popup || !popupMessage) {

        console.log(message);

        return;
    }

    popupMessage.textContent = message;

    popup.style.display = "flex";
}


function closeFocusFlowPopup() {

    const popup =
        document.getElementById("focusflowPopup");

    if (popup) {

        popup.style.display = "none";

    }
}


// ======================================================
// GET TOKEN
// ======================================================

function getToken() {

    return localStorage.getItem("token");

}


// ======================================================
// TODAY DATE
// ======================================================

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// ======================================================
// GET CURRENT TIME
// ======================================================

function getCurrentTime() {

    const now = new Date();

    const hours =
        String(now.getHours())
            .padStart(2, "0");

    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");

    return `${hours}:${minutes}`;
}


// ======================================================
// NORMALIZE DATE
// ======================================================

function normalizeDate(value) {

    if (!value) {
        return "";
    }

    // PostgreSQL normally returns:
    // 2026-09-15

    if (typeof value === "string") {

        return value.substring(0, 10);

    }

    if (value instanceof Date) {

        const year =
            value.getFullYear();

        const month =
            String(value.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(value.getDate())
                .padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    return String(value).substring(0, 10);
}


// ======================================================
// GET TASK DATE
// ======================================================

function getTaskDate(task) {

    return normalizeDate(

        task.task_date ??
        task.taskDate

    );

}


// ======================================================
// GET REMINDER ENABLED
// ======================================================

function getReminderEnabled(task) {

    return (
        task.reminder_enabled ??
        task.reminderEnabled ??
        false
    );

}


// ======================================================
// GET REMINDER TIME
// ======================================================

function getReminderTime(task) {

    return (
        task.reminder_time ??
        task.reminderTime ??
        null
    );

}


// ======================================================
// GET TASK ID
// ======================================================

function getTaskId(task) {

    return (
        task.id ??
        task._id
    );

}


// ======================================================
// NOTIFICATION PERMISSION
// ======================================================

function requestNotificationPermission() {

    if (!("Notification" in window)) {

        console.log(
            "Browser notifications are not supported."
        );

        return;
    }

    if (
        Notification.permission === "default"
    ) {

        Notification.requestPermission();

    }
}


// ======================================================
// LOAD TASKS FROM POSTGRESQL
// ======================================================

async function loadTasks() {

    try {

        const token = getToken();

        if (!token) {

            window.location.href =
                "login.html";

            return;
        }

        const response =
            await fetch(
                `${API_URL}/api/tasks`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        console.log(
            "Tasks received from PostgreSQL:",
            data
        );

        if (!response.ok) {

            showFocusFlowPopup(
                data.message ||
                "Unable to load tasks."
            );

            return;
        }

        if (!Array.isArray(data)) {

            console.log(
                "Unexpected tasks response:",
                data
            );

            showFocusFlowPopup(
                "Invalid task data received from server."
            );

            return;
        }

        const today =
            getTodayDate();

        taskList.innerHTML = "";

        // Display today's tasks
        data.forEach(function (task) {

            const taskDate =
                getTaskDate(task);

            console.log(
                "Task:",
                task.title,
                "Date:",
                taskDate,
                "Today:",
                today
            );

            if (taskDate === today) {

                addTaskToScreen(
                    getTaskId(task),
                    task.title,
                    task.completed,
                    getReminderEnabled(task),
                    getReminderTime(task)
                );

            }

        });

        updateDashboard();

        updateChart();

    } catch (error) {

        console.error(
            "Load tasks error:",
            error
        );

        showFocusFlowPopup(
            "Cannot connect to server!"
        );
    }
}


// ======================================================
// ADD TASK
// ======================================================

async function addTask() {

    const taskInput =
        document.getElementById("taskInput");

    if (!taskInput) {

        console.error(
            "taskInput not found"
        );

        return;
    }

    const taskText =
        taskInput.value.trim();

    if (taskText === "") {

        showFocusFlowPopup(
            "Please enter a task!"
        );

        return;
    }

    try {

        const token = getToken();

        const response =
            await fetch(
                `${API_URL}/api/tasks`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        title: taskText

                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "New task response:",
            data
        );

        if (!response.ok) {

            showFocusFlowPopup(
                data.message ||
                "Unable to add task."
            );

            return;
        }

        /*
            PostgreSQL:
            id
            task_date
            reminder_enabled
            reminder_time
        */

        addTaskToScreen(

            getTaskId(data),

            data.title,

            data.completed,

            getReminderEnabled(data),

            getReminderTime(data)

        );

        taskInput.value = "";

        updateDashboard();

        updateChart();

    } catch (error) {

        console.error(
            "Add task error:",
            error
        );

        showFocusFlowPopup(
            "Cannot connect to server!"
        );
    }
}


// ======================================================
// DISPLAY TASK ON SCREEN
// ======================================================

function addTaskToScreen(

    id,

    text,

    completed,

    reminderEnabled = false,

    reminderTime = null

) {

    if (
        id === undefined ||
        id === null
    ) {

        console.error(
            "Invalid task ID:",
            id
        );

        return;
    }

    const li =
        document.createElement("li");

    // PostgreSQL integer ID
    li.dataset.id = id;


    // ==================================================
    // TASK TEXT
    // ==================================================

    const span =
        document.createElement("span");

    span.textContent = text;


    if (completed) {

        span.classList.add(
            "completed"
        );

    }


    // ==================================================
    // COMPLETE / UNCOMPLETE TASK
    // ==================================================

    span.onclick = async function () {

        try {

            const token = getToken();

            console.log(
                "Updating task ID:",
                id
            );

            const response =
                await fetch(

                    `${API_URL}/api/tasks/${id}`,

                    {

                        method: "PUT",

                        headers: {

                            "Authorization":
                                `Bearer ${token}`

                        }

                    }

                );

            const data =
                await response.json();

            console.log(
                "Update task response:",
                data
            );

            if (!response.ok) {

                showFocusFlowPopup(
                    data.message ||
                    "Unable to update task."
                );

                return;
            }

            span.classList.toggle(

                "completed",

                Boolean(data.completed)

            );

            updateDashboard();

            updateChart();

        } catch (error) {

            console.error(
                "Complete task error:",
                error
            );

            showFocusFlowPopup(
                "Cannot connect to server!"
            );
        }
    };


    // ==================================================
    // REMINDER BUTTON
    // ==================================================

    const reminderBtn =
        document.createElement("button");

    reminderBtn.textContent =

        reminderEnabled

            ? `🔔 ${reminderTime}`

            : "🔔 Reminder";


    reminderBtn.onclick = async function () {

        const selectedTime =

            prompt(

                "Enter reminder time (HH:MM)\n\nExample: 18:30",

                reminderTime || ""

            );


        if (!selectedTime) {

            return;

        }


        // Validate HH:MM
        const timePattern =
            /^([01]\d|2[0-3]):([0-5]\d)$/;


        if (
            !timePattern.test(
                selectedTime
            )
        ) {

            showFocusFlowPopup(

                "Please enter time in HH:MM format.\nExample: 18:30"

            );

            return;
        }


        try {

            const token =
                getToken();


            const response =
                await fetch(

                    `${API_URL}/api/tasks/${id}/reminder`,

                    {

                        method: "PUT",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify({

                                reminderEnabled:
                                    true,

                                reminderTime:
                                    selectedTime

                            })

                    }

                );


            const data =
                await response.json();


            console.log(
                "Reminder response:",
                data
            );


            if (!response.ok) {

                showFocusFlowPopup(

                    data.message ||
                    "Unable to set reminder."

                );

                return;
            }


            reminderBtn.textContent =
                `🔔 ${selectedTime}`;


            showFocusFlowPopup(

                `Reminder set for ${selectedTime}`

            );


        } catch (error) {

            console.error(
                "Reminder error:",
                error
            );

            showFocusFlowPopup(
                "Cannot connect to server!"
            );
        }

    };


    // ==================================================
    // DELETE BUTTON
    // ==================================================

    const deleteBtn =
        document.createElement("button");

    deleteBtn.textContent = "❌";


    deleteBtn.onclick = async function () {

        try {

            const token =
                getToken();


            const response =
                await fetch(

                    `${API_URL}/api/tasks/${id}`,

                    {

                        method: "DELETE",

                        headers: {

                            "Authorization":
                                `Bearer ${token}`

                        }

                    }

                );


            const data =
                await response.json();


            console.log(
                "Delete response:",
                data
            );


            if (!response.ok) {

                showFocusFlowPopup(

                    data.message ||
                    "Unable to delete task."

                );

                return;
            }


            li.remove();


            updateDashboard();

            updateChart();


        } catch (error) {

            console.error(
                "Delete task error:",
                error
            );

            showFocusFlowPopup(
                "Cannot connect to server!"
            );
        }

    };


    // ==================================================
    // ADD ELEMENTS
    // ==================================================

    li.appendChild(span);

    li.appendChild(reminderBtn);

    li.appendChild(deleteBtn);

    taskList.appendChild(li);

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

async function updateDashboard() {

    let total = 0;

    let completed = 0;

    let pending = 0;


    document
        .querySelectorAll(
            "#taskList li span"
        )
        .forEach(function (span) {

            total++;


            if (
                span.classList.contains(
                    "completed"
                )
            ) {

                completed++;

            } else {

                pending++;

            }

        });


    const totalElement =
        document.getElementById(
            "totalTasks"
        );

    const completedElement =
        document.getElementById(
            "completedTasks"
        );

    const pendingElement =
        document.getElementById(
            "pendingTasks"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (completedElement) {

        completedElement.textContent =
            completed;

    }


    if (pendingElement) {

        pendingElement.textContent =
            pending;

    }


    // ==================================================
    // GET STREAK
    // ==================================================

    try {

        const token =
            getToken();


        const response =
            await fetch(

                `${API_URL}/api/tasks/streak`,

                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }

            );


        const data =
            await response.json();


        console.log(
            "Streak response:",
            data
        );


        if (response.ok) {

            const streakElement =
                document.getElementById(
                    "streak"
                );


            if (streakElement) {

                streakElement.textContent =

                    `${data.streak} ${
                        data.streak === 1
                            ? "Day"
                            : "Days"
                    }`;

            }

        }


    } catch (error) {

        console.error(
            "Streak error:",
            error
        );

    }

}


// ======================================================
// PRODUCTIVITY CHART
// ======================================================

async function updateChart() {

    try {

        const token =
            getToken();


        const response =
            await fetch(

                `${API_URL}/api/tasks/history`,

                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }

            );


        const data =
            await response.json();


        console.log(
            "History response:",
            data
        );


        if (!response.ok) {

            console.log(
                data.message
            );

            return;
        }


        const canvas =
            document.getElementById(
                "taskChart"
            );


        if (!canvas) {

            return;

        }


        const ctx =
            canvas.getContext("2d");


        if (chart) {

            chart.destroy();

        }


        /*
            PostgreSQL history normally returns:

            [
                {
                    completed_date: "2026-09-15",
                    count: "1"
                }
            ]
        */


        let dates = [];

        let completedCounts = [];


        if (Array.isArray(data)) {

            dates =
                data.map(function (item) {

                    return String(
                        item.completed_date
                    );

                });


            completedCounts =
                data.map(function (item) {

                    return Number(
                        item.count
                    );

                });

        }


        // Also support object response
        else if (
            data &&
            typeof data === "object"
        ) {

            dates =
                Object.keys(data);

            completedCounts =
                Object.values(data);

        }


        // No history
        if (dates.length === 0) {

            chart =
                new Chart(

                    ctx,

                    {

                        type: "bar",

                        data: {

                            labels:
                                ["No Data"],

                            datasets: [{

                                label:
                                    "Completed Tasks",

                                data:
                                    [0]

                            }]

                        },

                        options: {

                            responsive:
                                true

                        }

                    }

                );

            return;
        }


        chart =
            new Chart(

                ctx,

                {

                    type: "bar",

                    data: {

                        labels:
                            dates,

                        datasets: [{

                            label:
                                "Completed Tasks",

                            data:
                                completedCounts

                        }]

                    },

                    options: {

                        responsive:
                            true,

                        scales: {

                            y: {

                                beginAtZero:
                                    true,

                                ticks: {

                                    stepSize:
                                        1

                                }

                            }

                        }

                    }

                }

            );


    } catch (error) {

        console.error(
            "Productivity chart error:",
            error
        );

    }

}


// ======================================================
// CHECK REMINDERS
// ======================================================

async function checkReminders() {

    try {

        const token =
            getToken();


        if (!token) {

            return;

        }


        const response =
            await fetch(

                `${API_URL}/api/tasks`,

                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }

            );


        const tasks =
            await response.json();


        if (!response.ok) {

            return;

        }


        if (!Array.isArray(tasks)) {

            return;

        }


        const today =
            getTodayDate();


        const currentTime =
            getCurrentTime();


        tasks.forEach(function (task) {

            // Already completed
            if (task.completed) {

                return;

            }


            // Date
            const taskDate =
                getTaskDate(task);


            if (taskDate !== today) {

                return;

            }


            // Reminder enabled
            const enabled =
                getReminderEnabled(task);


            if (!enabled) {

                return;

            }


            // Reminder time
            const reminderTime =
                getReminderTime(task);


            if (
                reminderTime !==
                currentTime
            ) {

                return;

            }


            showReminderNotification(
                task.title
            );

        });


    } catch (error) {

        console.error(
            "Reminder check error:",
            error
        );

    }

}


// ======================================================
// SHOW REMINDER
// ======================================================

function showReminderNotification(
    taskTitle
) {

    if (
        !("Notification" in window)
    ) {

        showFocusFlowPopup(

            `🔔 Reminder!\n\n${taskTitle}\n\nThis task is still pending.`

        );

        return;
    }


    if (
        Notification.permission ===
        "granted"
    ) {

        new Notification(

            "🔔 FocusFlow Reminder",

            {

                body:
                    `${taskTitle} is still pending!`

            }

        );

    } else {

        showFocusFlowPopup(

            `🔔 FocusFlow Reminder\n\n${taskTitle}\n\nThis task is still pending.`

        );

    }

}


// ======================================================
// FOCUS TIMER
// ======================================================

function startTimer() {

    if (timerInterval) {

        return;

    }


    timerInterval =
        setInterval(function () {

            if (timeLeft <= 0) {

                clearInterval(
                    timerInterval
                );

                timerInterval = null;


                showFocusFlowPopup(

                    "Time's up! Take a break 🎉"

                );


                return;
            }


            timeLeft--;

            updateTimerDisplay();


        }, 1000);

}


// ======================================================
// RESET TIMER
// ======================================================

function resetTimer() {

    clearInterval(
        timerInterval
    );

    timerInterval = null;

    timeLeft = 25 * 60;

    updateTimerDisplay();

}


// ======================================================
// TIMER DISPLAY
// ======================================================

function updateTimerDisplay() {

    const timer =
        document.getElementById(
            "timer"
        );


    if (!timer) {

        return;

    }


    const minutes =
        Math.floor(
            timeLeft / 60
        );


    const seconds =
        timeLeft % 60;


    timer.textContent =

        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

}


// ======================================================
// DARK MODE
// ======================================================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );


    if (
        document.body.classList.contains(
            "dark-mode"
        )
    ) {

        localStorage.setItem(
            "darkMode",
            "enabled"
        );

    } else {

        localStorage.setItem(
            "darkMode",
            "disabled"
        );

    }

}


// ======================================================
// DISPLAY USER NAME
// ======================================================

function displayUserName() {

    const userData =
        localStorage.getItem("user");


    if (!userData) {

        return;

    }


    try {

        const user =
            JSON.parse(userData);


        const userName =
            document.getElementById(
                "userName"
            );


        if (
            userName &&
            user
        ) {

            userName.textContent =
                user.name || "";

        }


    } catch (error) {

        console.error(
            "User data error:",
            error
        );

    }

}


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );


    window.location.href =
        "login.html";

}