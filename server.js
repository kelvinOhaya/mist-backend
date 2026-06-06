//importing express, cors, routes, the cookie parser, and the environment variable decoder
const express = require("express");
const cors = require("cors");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const chatRoomRoutes = require("./routes/chatRoomRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const {
  PORT,
  FRONTEND_URL,
  FRONTEND_NETWORK_URL,
  FRONTEND_PORT,
} = require("./config/env");
const path = require("path");
const { init } = require("./io");
const initSocket = require("./sockets/chatSocket");

const port = PORT || 5000;
const allowedOrigins = [
  `http://localhost:${FRONTEND_PORT}`,
  FRONTEND_URL,
  FRONTEND_NETWORK_URL,
].filter(Boolean);

//connect to mongodb (consult db.js)
connectDB();

//make an express instance
const app = express();

//connect to socket.io
const server = http.createServer(app);
const io = init(server, allowedOrigins);
const corsOptions = {
  credentials: true, // allows us to use cookies in our requests
  origin: (origin, callback) => {
    // allow non-browser requests like curl/postman (no origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS policy: origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
initSocket(io);

//allows use for json, parsing cookies, and cors
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
//initialize socketio's logic

//mount all the routers
app.use("/api/auth", authRoutes);
app.use("/api/chatroom", chatRoomRoutes);
app.use("/api/upload", uploadRoutes);

// Generic error handler (returns JSON and logs stack)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

app.options("*", cors(corsOptions));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection at:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

//listen on this port, and do the following function once listening.
server.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening on port ${port} on all interfaces`);
});
