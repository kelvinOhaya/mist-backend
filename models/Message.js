const mongoose = require("mongoose");
const { Schema } = mongoose;
const ChatRoom = require("./ChatRoom");
const User = require("./User");

const messageSchema = new Schema(
  {
    type: { type: String, required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    chatRoom: { type: Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);

//Make it so that rather that storing the sender and profile picture separately, you store a reference of the user and populate the data when needed.
//Make adjustments to the frontend where necessary as well

//
