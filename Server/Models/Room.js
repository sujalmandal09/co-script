const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    minlength: 6,
    maxlength: 6,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  hostSocketId: String,
  hostName: String,
  pendingRequests: [{
    odId: mongoose.Schema.Types.ObjectId,
    userName: String,
    socketId: String,
    requestedAt: { type: Date, default: Date.now },
  }],
  approvedUsers: [{
    odId: mongoose.Schema.Types.ObjectId,
    userName: String,
    socketId: String,
  }],
  code: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

module.exports = mongoose.model("Room", RoomSchema);

