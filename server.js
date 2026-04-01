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
const adminRoutes = require("./routes/adminRoutes/index");
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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ================== SESSION ==================
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // ✅ FIX
      httpOnly: true,
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ FIX
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

// Make io accessible to request handlers via req.app.get('io')
app.set("io", io);

// ================== SERVER ==================

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ WebSocket server active`);
});

module.exports = app;
