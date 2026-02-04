import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import connectDB from "./server/config/db.config.js";
import { config } from "./server/constants.js";
import { initSocket } from "./server/config/socket.config.js";

const app = express();

// -----------------------
// Create logs directory
// -----------------------
const logDirectory = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Create a write stream (append mode) for logging requests
const accessLogStream = fs.createWriteStream(
    path.join(logDirectory, "access.log"),
    { flags: "a" },
);

// -----------------------
// Console Logging to File
// -----------------------
const logFile = fs.createWriteStream(path.join(logDirectory, "console.log"), {
    flags: "a",
});

const logStdout = process.stdout;

// Override console.log
console.log = function (...args) {
    const message = args.join(" ") + "\n";
    logFile.write(`[LOG] ${new Date().toISOString()} - ${message}`);
    logStdout.write(message);
};

// Override console.error
console.error = function (...args) {
    const message = args.join(" ") + "\n";
    logFile.write(`[ERROR] ${new Date().toISOString()} - ${message}`);
    logStdout.write(message);
};

// Use Morgan to log requests to the file and console
app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev"));

// -----------------------
// Middlewares
// -----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Allowed domains
const allowedDomains = [
    // for Deployed frontend URL
    "http://localhost:5173", // for development
    "http://localhost:5174", // for development
];
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true); // allow non-browser requests like Postman

            if (allowedDomains.includes(origin)) {
                callback(null, true); // ✅ allow request
            } else {
                callback(new Error("Not allowed by CORS")); // ❌ block request
            }
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
        credentials: true,
    }),
);

// connectDB()
//     .then(() => {
//         app.listen(config.port, () =>
//             console.log(`Server running on port ${config.port}`),
//         );
//         app.on("error", (error) => {
//             console.error("Error on the server: ", error);
//             throw error;
//         });
//     })
//     .catch((error) => console.log("MongoDB Connection Failed: ", error));

// -----------------------
// Health Check Route
// -----------------------
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "The server is running fine 👍🏻- v1.0.0",
    });
});

// ----------------------------------------
// Route to fetch last 100 lines of logs
// ----------------------------------------
app.get("/logs", (req, res) => {
    const logFilePath = path.join(logDirectory, "access.log");

    // Read last 100 lines from the log file
    fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
            return res
                .status(500)
                .json({ success: false, message: "Error reading log file" });
        }

        const lines = data.trim().split("\n");
        const last100Lines = lines.slice(-100).join("\n");

        res.setHeader("Content-Type", "text/plain");
        res.send(last100Lines);
    });
});

// ----------------------------------------
// Route to fetch last 100 lines of console.logs
// ----------------------------------------
app.get("/console-logs", (req, res) => {
    const logFilePath = path.join(logDirectory, "console.log");

    // Read last 100 lines from the log file
    fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
            return res
                .status(500)
                .json({ success: false, message: "Error reading log file" });
        }

        const lines = data.trim().split("\n");
        const last100Lines = lines.slice(-100).join("\n");

        res.setHeader("Content-Type", "text/plain");
        res.send(last100Lines);
    });
});

// ------------------------
// Import Routes
// ------------------------
import userRoutes from "./server/routes/user.routes.js";

// ------------------------
// Use the routes
// ------------------------
app.use("/api/v1/user", userRoutes);

// ------------------------
// 404 route handler
// ------------------------
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// -----------------------
// Start Server + DB Connection
// -----------------------
const PORT = config.port;
let server;

// -------------------------------------------------
// Create HTTP server and attach Express + Socket.IO
// -------------------------------------------------
const httpServer = http.createServer(app);

// Initialize WebSocket server
initSocket(httpServer);

// ------------------------------
// Start Server + DB Connection
// ------------------------------
// START SERVER
const startServer = async () => {
    try {
        await connectDB();
        console.log("✅ MongoDB connected");

        server = httpServer.listen(PORT, () => {
            console.log(`🔥 Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Startup failure:", err);
        process.exit(1);
    }
};

startServer();

// -----------------------
// Graceful Shutdown Handler
// -----------------------
const gracefulExit = (signal) => {
    console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);

    if (server) {
        server.close(() => {
            console.log("🛑 Express server closed");

            mongoose.connection.close(false, () => {
                console.log("📦 MongoDB connection closed");
                process.exit(0);
            });
        });
    } else {
        process.exit(0);
    }
};

// -----------------------
// Handle OS Signals
// -----------------------
process.on("SIGINT", () => gracefulExit("SIGINT")); // Ctrl + C
process.on("SIGTERM", () => gracefulExit("SIGTERM")); // Kill signal (Docker, PM2)

export default app;
