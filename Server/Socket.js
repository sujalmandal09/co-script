const Room = require("./Models/Room");
const { initTerminalHandlers } = require("./TerminalService");
const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = path.join(__dirname, 'workspace');

const inMemoryRooms = new Map();

// Generate 6-character alphanumeric Room ID
function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: 0,O,I,1
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function socketHandler(io, dbConnected) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Initialize Terminal handlers for this socket (node-pty based)
    initTerminalHandlers(socket, io);

    // === FILE SYNC ===
    socket.on('file:save', ({ filename, content }) => {
      try {
        // Basic security: prevent traversing up
        const safeName = path.basename(filename);
        const filepath = path.join(WORKSPACE_DIR, safeName);
        fs.writeFileSync(filepath, content);
        console.log(`[File] Saved ${safeName} to workspace`);
      } catch (e) {
        console.error(`[File] Error saving ${filename}:`, e.message);
      }
    });

    // === ROOM CREATION (Host Only) ===
    socket.on("create_room", async ({ userId, userName }) => {
      try {
        let roomId = generateRoomId();

        // Ensure unique room ID
        if (dbConnected) {
          let attempts = 0;
          while (await Room.findOne({ roomId }) && attempts < 10) {
            roomId = generateRoomId();
            attempts++;
          }

          const room = await Room.create({
            roomId,
            hostId: userId,
            hostSocketId: socket.id,
            hostName: userName,
            code: "",
            approvedUsers: [{ odId: userId, userName, socketId: socket.id }],
          });

          socket.join(roomId);
          socket.emit("room_created", {
            roomId,
            isHost: true,
            hostName: userName
          });
          console.log(`Room ${roomId} created by ${userName}`);
        } else {
          // In-memory fallback
          while (inMemoryRooms.has(roomId)) {
            roomId = generateRoomId();
          }

          inMemoryRooms.set(roomId, {
            hostSocketId: socket.id,
            hostName: userName,
            code: "",
            pendingRequests: [],
            approvedUsers: [{ userName, socketId: socket.id }],
          });

          socket.join(roomId);
          socket.emit("room_created", {
            roomId,
            isHost: true,
            hostName: userName
          });
        }
      } catch (error) {
        console.error("Create room error:", error);
        socket.emit("room_error", { error: "Failed to create room" });
      }
    });

    // === JOIN REQUEST (Non-Host) ===
    socket.on("request_join", async ({ roomId, userId, userName }) => {
      try {
        roomId = roomId.toUpperCase();

        if (dbConnected) {
          const room = await Room.findOne({ roomId });

          if (!room) {
            socket.emit("join_error", { error: "Room not found. Please check the Room ID." });
            return;
          }

          // Add to pending requests
          room.pendingRequests.push({
            odId: userId,
            userName,
            socketId: socket.id,
          });
          await room.save();

          // Notify host
          if (room.hostSocketId) {
            io.to(room.hostSocketId).emit("join_request", {
              socketId: socket.id,
              userName,
              userId,
              roomId,
            });
          }

          socket.emit("join_pending", {
            message: "Join request sent. Waiting for host approval..."
          });

        } else {
          // In-memory fallback
          const room = inMemoryRooms.get(roomId);

          if (!room) {
            socket.emit("join_error", { error: "Room not found. Please check the Room ID." });
            return;
          }

          room.pendingRequests.push({ userName, socketId: socket.id });

          // Notify host
          io.to(room.hostSocketId).emit("join_request", {
            socketId: socket.id,
            userName,
            roomId,
          });

          socket.emit("join_pending", {
            message: "Join request sent. Waiting for host approval..."
          });
        }
      } catch (error) {
        console.error("Join request error:", error);
        socket.emit("join_error", { error: "Failed to send join request" });
      }
    });

    // === HOST RESPONDS TO JOIN REQUEST ===
    socket.on("join_response", async ({ roomId, requesterSocketId, accepted, userName }) => {
      try {
        roomId = roomId.toUpperCase();

        if (dbConnected) {
          const room = await Room.findOne({ roomId });

          if (!room || room.hostSocketId !== socket.id) {
            socket.emit("room_error", { error: "Only the host can approve/decline requests" });
            return;
          }

          // Remove from pending
          room.pendingRequests = room.pendingRequests.filter(
            req => req.socketId !== requesterSocketId
          );

          if (accepted) {
            // Add to approved users
            room.approvedUsers.push({ userName, socketId: requesterSocketId });
            await room.save();

            // Join the requester to the room
            const requesterSocket = io.sockets.sockets.get(requesterSocketId);
            if (requesterSocket) {
              requesterSocket.join(roomId);

              // Notify requester they're accepted
              io.to(requesterSocketId).emit("join_accepted", {
                roomId,
                code: room.code,
                hostName: room.hostName,
              });

              // Notify everyone in room about new user
              socket.to(roomId).emit("user_joined", {
                userName,
                socketId: requesterSocketId
              });
            }
          } else {
            await room.save();
            // Notify requester they're declined
            io.to(requesterSocketId).emit("join_declined", {
              message: "Your join request was declined by the host."
            });
          }

        } else {
          // In-memory
          const room = inMemoryRooms.get(roomId);

          if (!room || room.hostSocketId !== socket.id) {
            socket.emit("room_error", { error: "Only the host can approve/decline requests" });
            return;
          }

          room.pendingRequests = room.pendingRequests.filter(
            req => req.socketId !== requesterSocketId
          );

          if (accepted) {
            room.approvedUsers.push({ userName, socketId: requesterSocketId });

            const requesterSocket = io.sockets.sockets.get(requesterSocketId);
            if (requesterSocket) {
              requesterSocket.join(roomId);

              io.to(requesterSocketId).emit("join_accepted", {
                roomId,
                code: room.code,
                hostName: room.hostName,
              });

              socket.to(roomId).emit("user_joined", {
                userName,
                socketId: requesterSocketId
              });
            }
          } else {
            io.to(requesterSocketId).emit("join_declined", {
              message: "Your join request was declined by the host."
            });
          }
        }
      } catch (error) {
        console.error("Join response error:", error);
        socket.emit("room_error", { error: "Failed to process join response" });
      }
    });

    // === HOST REMOVES USER ===
    socket.on("remove_user", async ({ roomId, targetSocketId, targetUserName }) => {
      try {
        roomId = roomId.toUpperCase();

        if (dbConnected) {
          const room = await Room.findOne({ roomId });

          if (!room || room.hostSocketId !== socket.id) {
            socket.emit("room_error", { error: "Only the host can remove users" });
            return;
          }

          // Remove from approved users
          room.approvedUsers = room.approvedUsers.filter(
            u => u.socketId !== targetSocketId
          );
          await room.save();

        } else {
          const room = inMemoryRooms.get(roomId);
          if (!room || room.hostSocketId !== socket.id) {
            socket.emit("room_error", { error: "Only the host can remove users" });
            return;
          }

          room.approvedUsers = room.approvedUsers.filter(
            u => u.socketId !== targetSocketId
          );
        }

        // Kick the user from room
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(roomId);
          io.to(targetSocketId).emit("user_removed", {
            message: "You have been removed from the room by the host."
          });
        }

        // Notify room
        io.to(roomId).emit("user_left", {
          userName: targetUserName,
          socketId: targetSocketId,
          removed: true
        });

      } catch (error) {
        console.error("Remove user error:", error);
        socket.emit("room_error", { error: "Failed to remove user" });
      }
    });

    // === LEGACY: Direct join for host after creation ===
    socket.on("join_room", async ({ roomId, username }) => {
      socket.join(roomId);

      let code = "";

      if (dbConnected) {
        let room = await Room.findOne({ roomId });
        if (room) {
          code = room.code;
        }
      } else {
        if (inMemoryRooms.has(roomId)) {
          code = inMemoryRooms.get(roomId).code || "";
        }
      }

      socket.emit("load_code", { code });
    });

    // === CODE CHANGES ===
    socket.on("code_change", async ({ roomId, code }) => {
      socket.to(roomId).emit("code_update", { code });

      if (dbConnected) {
        await Room.updateOne(
          { roomId },
          { code, updatedAt: new Date() }
        );
      } else {
        const room = inMemoryRooms.get(roomId);
        if (room) {
          room.code = code;
        }
      }
    });

    // === GET ROOM USERS ===
    socket.on("get_room_users", async ({ roomId }) => {
      roomId = roomId.toUpperCase();

      if (dbConnected) {
        const room = await Room.findOne({ roomId });
        if (room) {
          socket.emit("room_users", {
            users: room.approvedUsers,
            hostSocketId: room.hostSocketId
          });
        }
      } else {
        const room = inMemoryRooms.get(roomId);
        if (room) {
          socket.emit("room_users", {
            users: room.approvedUsers,
            hostSocketId: room.hostSocketId
          });
        }
      }
    });

    // === DISCONNECT ===
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      // Handle user leaving rooms - notify others
      if (dbConnected) {
        const rooms = await Room.find({
          "approvedUsers.socketId": socket.id
        });

        for (const room of rooms) {
          const user = room.approvedUsers.find(u => u.socketId === socket.id);
          if (user) {
            io.to(room.roomId).emit("user_left", {
              userName: user.userName,
              socketId: socket.id
            });
          }
        }
      }
    });
  });
}

module.exports = socketHandler;
