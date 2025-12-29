const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: String,
  code: String,
  updatedAt: Date,
});

module.exports = mongoose.model("Room", RoomSchema);
