const Room = require("./Models/Room");

const inMemoryRooms = new Map();

function socketHandler(io, dbConnected) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", async ({ roomId, username }) => {
      socket.join(roomId);

      let code = "";

      if (dbConnected) {
        let room = await Room.findOne({ roomId });
        if (!room) {
          room = await Room.create({ roomId, code: "" });
        }
        code = room.code;
      } else {
        if (!inMemoryRooms.has(roomId)) {
          inMemoryRooms.set(roomId, "");
        }
        code = inMemoryRooms.get(roomId);
      }

      socket.emit("load_code", { code });
    });

    socket.on("code_change", async ({ roomId, code }) => {
      socket.to(roomId).emit("code_update", { code });

      if (dbConnected) {
        await Room.updateOne(
          { roomId },
          { code, updatedAt: new Date() }
        );
      } else {
        inMemoryRooms.set(roomId, code);
      }
    });
  });
}

module.exports = socketHandler;
