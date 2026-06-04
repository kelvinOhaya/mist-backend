const Message = require("../models/Message");
const mongoose = require("mongoose");
const ChatRoom = require("../models/ChatRoom");
const OnlineId = require("../models/OnlineId");

function initSocket(io) {
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new Error("Authentication error"));
    }
    socket.userId = userId;
    next();
  });

  io.on("connection", async (socket) => {
    console.log(`User ${socket.userId} has connected`);

    try {
      // Update or create online status
      await OnlineId.findOneAndUpdate(
        { userId: socket.userId },
        { socketId: socket.id },
        { upsert: true, new: true },
      );

      // Rejoin rooms on reconnection
      const userRooms = await ChatRoom.find({
        members: socket.userId,
      }).select("_id");

      userRooms.forEach((room) => {
        socket.join(room._id.toString());
        console.log(`User ${socket.userId} rejoined room ${room._id}`);
      });
    } catch (error) {
      console.error("Error handling connection:", error);
    }

    socket.on("join-room", async (data) => {
      try {
        if (data.prevRoom) {
          await socket.leave(data.prevRoom);
        }
        await socket.join(data.newRoom);

        // Notify room members
        io.to(data.newRoom).emit("user-joined", {
          userId: socket.userId,
          roomId: data.newRoom,
        });

        console.log(`User ${socket.userId} joined room ${data.newRoom}`);
      } catch (error) {
        console.error("Error joining room:", error);
      }
    });

    socket.on("send-message", async (message) => {
      console.log(message);
      const newMessage = new Message({
        type: "message",
        sender: message.sender._id,
        chatRoom: message.chatRoomId,
        content: message.content,
      });
      const clientMessage = {
        sender: {
          username: message.sender.username,
          profilePicture: message.sender.profilePicture,
        },
        chatRoom: message.chatRoomId,
        content: message.content,
      };

      console.log("The new message: ", clientMessage);
      await newMessage.save();
      io.to(message.chatRoomId).emit("receive-message", clientMessage);
    });

    //leave the socket chat room
    socket.on("leave-room", (data) => {
      try {
        const { currentRoomId } = data;
        socket.leave(currentRoomId);
        console.log(`User ${socket.userId} left room ${currentRoomId}`);
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await OnlineId.findOneAndDelete({ userId: socket.userId });
        console.log(`User ${socket.userId} disconnected`);
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
}

module.exports = initSocket;
