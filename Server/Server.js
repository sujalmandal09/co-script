require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./Config/db");
const socketHandler = require("./Socket");

const app = express();
app.use(cors());
app.use(express.json());

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
