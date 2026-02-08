require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./Config/db");
const socketHandler = require("./Socket");
const { executeCode, LANGUAGES } = require("./CodeRunner");
const authRoutes = require("./Routes/authRoutes");

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Auth routes
app.use("/api/auth", authRoutes);

// Code execution endpoint
app.post("/execute", async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({
      success: false,
      error: "Missing 'language' or 'code' in request body"
    });
  }

  try {
    const result = await executeCode(language, code);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported languages
app.get("/languages", (req, res) => {
  res.json({ languages: Object.keys(LANGUAGES) });
});

const startServer = async () => {
  const dbConnected = await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
  });

  socketHandler(io, dbConnected);

  server.listen(3001, () => console.log("Server running on port 3001"));
};

startServer();
