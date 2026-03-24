const express = require("express");
const cors = require("cors");
const connectDB = require("./config/dbConnection");
const http = require("http");
const session = require("express-session");
const socketIo = require("socket.io");
require("dotenv").config();

// ================== SOCKET EVENTS ==================
const initializeSocketEvents = require("./socketEvents/index");

// ================== ROUTES ==================
const userRoutes = require("./routes/userRoutes/index");
const adminRoutes = require("./routes/adminRoutes/adminRoutes");
const seedAdmin = require("./scripts/adminSeeder");

const app = express();

// ================== DATABASE ==================
connectDB();

// ✅ Run seeder only in development
if (process.env.NODE_ENV !== "production") {
  seedAdmin();
}

// ================== ENV CHECK ==================
const isProduction = process.env.NODE_ENV === "production";

// ================== ALLOWED ORIGINS ==================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://marathishubhavivah.com",
];

// ================== CORS ==================
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ================== BODY PARSER ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== SESSION (FINAL FIX) ==================
app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET || "matrimonial_captcha_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,               // ✅ dynamic
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax", // ✅ dynamic fix
      maxAge: 5 * 60 * 1000,
    },
  })
);

// ================== ROUTES ==================
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// ================== HEALTH CHECK ==================
app.get("/", (req, res) => {
  res.send("Matrimonial Backend Is Running");
});

// ================== SOCKET.IO ==================
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by Socket.IO CORS"));
      }
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize socket events
initializeSocketEvents(io);

// Make io accessible
app.set("io", io);

// ================== SERVER ==================
const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ WebSocket server active`);
});

module.exports = app;