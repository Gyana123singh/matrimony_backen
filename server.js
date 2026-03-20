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
seedAdmin();

// ================== MIDDLEWARES ==================

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://marathishubhavivah.com"
        : [
            "http://localhost:5174",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5173",
            "https://marathishubhavivah.com",
          ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== SESSION ==================

app.use(
  session({
    secret: process.env.SESSION_SECRET || "matrimonial_captcha_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true only in https
      httpOnly: true,
      sameSite: "lax", // Allow same-site requests from different ports
      maxAge: 5 * 60 * 1000, // 5 minutes
      domain: undefined, // Let the browser handle the domain
    },
  }),
);

// ================== ROUTES ==================

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// ================== HEALTH CHECK ==================

app.get("/", (req, res) => {
  res.send("Matrimonial Backend Is Running");
});

// ================== SOCKET.IO SETUP ==================

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize all socket events
initializeSocketEvents(io);

// ================== SERVER ==================

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ WebSocket server active`);
});

module.exports = app;
