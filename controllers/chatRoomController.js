const utils = require("../utils/utils");
const ChatRoom = require("../models/ChatRoom");
const User = require("../models/User");
const mongoose = require("mongoose");
const JoinCode = require("../models/JoinCode");
const Message = require("../models/Message");
const OnlineId = require("../models/OnlineId");
const { getIo } = require("../io");
const { ObjectId } = require("mongodb");
// const Message = require("../models/Message");

exports.createRoom = async (req, res) => {
  const { name, senderId } = req.body;
  const joinCode = await utils.generateJoinCode(6);

  const newChatRoom = new ChatRoom({
    name: name,
    creator: senderId,
    members: [senderId],
    joinCode: joinCode,
  });

  await newChatRoom.save();

  const clientChatRoom = await ChatRoom.findOne({ joinCode }).lean();
  clientChatRoom.memberCount = clientChatRoom.members.length;

  return res.json({ newRoom: clientChatRoom });
};

exports.joinRoom = async (req, res) => {
  const senderId = req.user.id;
  let { joinCode } = req.body;
  joinCode = joinCode.trim();
  console.log(senderId);

  //look for a room, and if one is not found, send error to client
  const foundRoom = await ChatRoom.findOneAndUpdate(
    { joinCode }, //find the field based on the joinCode
    { $addToSet: { members: senderId } }, //add the senderId to members[]
    { new: true }, //return the updated document
  ).lean();

  foundRoom.memberCount = foundRoom.members.length;
  // console.log(
  //   `We found the following room when joining a group chat: \n${JSON.stringify(
  //     foundRoom,
  //   )}`,
  // );

  //find all onlineIds that are in the member's array for foundRoom's members
  const foundOnlineIds = await OnlineId.find({
    //since you used .lean()the members need to be converted back to Ids from strings
    userId: {
      $in: foundRoom.members.map((memberId) => new ObjectId(memberId)),
    },
  });

  if (foundOnlineIds.length > 0) {
    foundOnlineIds.map((id, ind) => console.log(`Id ${ind}: ${id}\n`));
    //increase the member count of each of them by one
    foundOnlineIds.forEach((id) => {
      getIo().to(id.socketId).emit("increase-member-count", {
        updatedRoomId: foundRoom._id,
      });
    });
  } else {
    console.log("No online IDs were found");
  }

  //send this new room to the client
  return res.status(200).json({ newRoom: foundRoom });
};

//For making new DMs
exports.findUser = async (req, res) => {
  let { joinCode } = req.body;
  joinCode = joinCode.trim();
  const senderId = new ObjectId(req.user.id);
  let roomToUpdate = null;

  //look for the other user. If they don't exist, return an error
  const foundUser = await User.exists({ joinCode });
  if (!foundUser) {
    return res.status(404).json({ message: "Error: User not found" });
  }

  //debug message to ensure foundUser exists
  //console.log(`The following User ID was found: ${JSON.stringify(foundUser)}`);

  //look for the user's corresponding onlineID. If it doesn't exist, return an error
  const foundOnlineId = await OnlineId.findOne({ userId: foundUser._id });

  //debug message to ensure OnlineId exists
  //console.log(`The following online ID was found: ${foundOnlineId}`);

  //extracted aggregation logic for finding and populating fields with otherUser
  const getDmPipeline = (senderId, matchStage) => [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        let: { memberIds: "$members" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$memberIds"] } } },
          { $project: { username: 1, profilePicture: 1, joinCode: 1 } },
        ],
        as: "members",
      },
    },
    {
      $addFields: {
        otherUser: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$members",
                as: "member",
                cond: { $ne: ["$$member._id", senderId] },
                limit: 1,
              },
            },
            0,
          ],
        },
        memberCount: { $size: "$members" },
      },
    },
    { $unset: "exMembers" },
  ];

  //aggregation for the foundRoom Document

  //update the room first, but if that doesnt work return an error
  try {
    roomToUpdate = await ChatRoom.updateOne(
      {
        isDm: true,
        $or: [
          { members: { $all: [senderId, foundUser._id] } },
          { members: senderId, exMembers: foundUser._id },
          { members: foundUser._id, exMembers: senderId },
        ],
      },
      {
        $pull: { exMembers: senderId },
        $addToSet: { members: senderId },
      },
    );
  } catch (error) {
    roomToUpdate = null;
  }

  console.log(`Updated room results:\n ${JSON.stringify(roomToUpdate)}`);

  //if such a room exists, update that room
  if (roomToUpdate.modifiedCount > 0) {
    const foundRoom = await ChatRoom.aggregate(
      getDmPipeline(senderId, {
        isDm: true,
        $or: [
          //check if any of these are true
          { members: { $all: [senderId, foundUser._id] } }, //both user's ids are in members[]
          //the sender's id is in members[], and the other person's id is in exMembers[]
          {
            $and: [
              //senderId needs to be converted to ab objectId because right now its just a string
              { members: { $in: [senderId] } }, //check to see if senderId is in the members array
              { exMembers: { $in: [foundUser._id] } }, //follows ^this logic
            ],
          },
          //the other person's id is in members[], and the sender's id is in exMembers[]
          {
            $and: [
              { members: { $in: [foundUser._id] } },
              { exMembers: { $in: [senderId] } },
            ],
          },
        ],
      }),
    );

    console.log("Here is the found room:\n", foundRoom); //check if the client room exists or not

    //SEND SOCKET EVENT TO INCREASE MEMBER COUNT AS WELL (only if onlineId is found, otherwise the other person isn't online, so there's no point)
    if (foundOnlineId) {
      // console.log(`We found the following ID: \n${foundOnlineId}`); //check if the onlineId exists
      console.log(`foundRoom._id: ${foundRoom[0]._id}`);
      getIo()
        .to(foundOnlineId.socketId)
        .emit("increase-member-count", { updatedRoomId: foundRoom[0]._id }); //make this a new event called "increase-member-count" for clarity
    }

    //send the new room and the id of the other user to the client
    return res
      .status(200)
      .json({ otherUserId: foundUser._id, newRoom: foundRoom[0] });
  } else {
    //if the foundRoom doesn't exist, make a new one and save it to mongodb
    const newJoinCode = await utils.generateJoinCode(6);
    const newDm = new ChatRoom({
      isDm: true,
      creator: null,
      members: [senderId, foundUser._id],
      joinCode: newJoinCode,
      profilePicture: null,
    });

    await newDm.save();

    //find the chat room that was just created
    const foundDm = await ChatRoom.aggregate(
      getDmPipeline(
        senderId,
        { joinCode: newJoinCode }, //find the room with the matching joincode)
      ),
    );

    // console.log(`Found the following DM: ${foundDm}`); //--check if the dm exists

    //make an altered version for the other user where the sender is the otherUser
    const alteredFoundDm = {
      ...foundDm[0],
      otherUser: foundDm[0].members.find(
        (member) => member._id.toString() === senderId.toString(),
      ),
    };

    console.log(
      `Here's your altered DM: ${JSON.stringify(alteredFoundDm, null, 2)}`,
    ); //--shows the altered DM

    //send the socketEvent "add-room"
    if (foundOnlineId) {
      getIo()
        .to(foundOnlineId.socketId)
        .emit("add-room", { updatedRoom: alteredFoundDm });
    }

    //send status 200 with the otherUserId and the new room
    return res
      .status(200)
      .json({ otherUserId: foundUser._id, newRoom: foundDm[0] });
  }
};

exports.sendInfo = async (req, res) => {
  const senderId = req.user.id;
  // console.log(`IO constructor name: ${getIo().constructor.name}`);

  //find all chat rooms where the user's Id is in there
  try {
    const [foundUser, filteredChatRooms] = await Promise.all([
      User.findById(senderId),

      ChatRoom.aggregate([
        {
          $match: {
            members: new ObjectId(senderId),
          },
        },
        {
          $lookup: {
            from: "users",
            let: { memberId: "$members" },
            pipeline: [
              { $match: { $expr: { $in: ["$_id", "$$memberId"] } } },
              { $project: { username: 1, profilePicture: 1, joinCode: 1 } },
            ],
            as: "members",
          },
        },
        {
          $lookup: {
            from: "users",
            let: { exMemberIds: "$exMembers" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: [
                      { $gt: [{ $size: "$$exMemberIds" }, 0] },
                      { $in: ["$_id", "$$exMemberIds"] },
                      false,
                    ],
                  },
                },
              },
              { $project: { username: 1, profilePicture: 1 } },
            ],
            as: "exMembers",
          },
        },
      ]),
    ]);

    filteredChatRooms.forEach((room) => {
      room.memberCount = room.members.length;

      if (room.isDm === true) {
        if (room.members.length > 1) {
          room.otherUser = room.members.find(
            (user) => user.username != foundUser.username,
          );
        } else {
          room.otherUser = room.exMembers.find(
            (user) => user.username != foundUser.username,
          );
        }
        if (!room.otherUser) {
          console.log("No other user could be found");
        }
      }
    });

    const currentChat =
      filteredChatRooms.filter(
        (room) => room._id.toString() === foundUser.currentChat?.toString(),
      )[0] || null;

    !currentChat && console.log("No current chat found");

    if (filteredChatRooms.length === 0) {
      return res.status(200).json({ message: "empty" });
    }
    return res.status(200).json({ chatRooms: filteredChatRooms, currentChat });
  } catch (error) {
    console.log(error);
  }
};

exports.loadMessages = async (req, res) => {
  console.log("Load messages endpoint reached");
  const { currentChatId } = req.body;
  try {
    const foundMessages = await Message.find({
      chatRoom: currentChatId,
    }).populate("sender", "username profilePicture");
    res.status(200).json({ messages: foundMessages });
  } catch (error) {
    console.log("Error loading the chat rooms: ", error);
  }
};

exports.verifyJoinCode = async (req, res) => {
  const { joinCode } = req.body;

  const foundRoom = await ChatRoom.findOne({ joinCode });
  const foundUser = await User.findOne({ joinCode });

  return res.json({ isValid: foundRoom !== null || foundUser !== null });
};

exports.changeName = async (req, res) => {
  const { newName, currentRoomId } = req.body;

  try {
    const foundChatRoom = await ChatRoom.findOneAndUpdate(
      {
        _id: currentRoomId,
      },
      { $set: { name: newName } },
      { new: true },
    ).select("members");

    console.log(`Update results: \n${JSON.stringify(foundChatRoom, null, 2)}`);

    const foundOnlineIds = await OnlineId.find({
      userId: { $in: foundChatRoom.members },
    });

    console.log(
      `All reported onlineIds:\n ${JSON.stringify(foundOnlineIds, null, 2)}`,
    );

    foundOnlineIds.forEach((onlineId) => {
      getIo()
        .to(onlineId.socketId)
        .emit("update-room-name", { roomId: currentRoomId, newName });
    });

    res.sendStatus(200);
  } catch (error) {
    console.log("Error in the changeName function: ", error);
  }
};

exports.updateCurrentRoom = async (req, res) => {
  const userId = req.user.id;
  const { currentRoomId, socketId } = req.body;
  console.log(`Socket Id: ${socketId}`);

  try {
    await User.findByIdAndUpdate(
      userId,
      { currentChat: currentRoomId },
      { new: true },
    );
    getIo().to(socketId).emit("print-success");
    return res.sendStatus(200);
  } catch (error) {
    console.log("Error trying to find the user: ", error);
  }
};

/** Function for deleting the chat room */
exports.leaveRoom = async (req, res) => {
  const senderId = req.user.id;
  const { currentRoomId } = req.body;
  console.log(`Current Room Id: ${currentRoomId}`);

  try {
    const [foundChatRoom, foundUser] = await Promise.all([
      ChatRoom.findById(currentRoomId),
      await User.findById(senderId),
    ]);
    if (!foundChatRoom) {
      throw new Error("The chatroom with the given Id could not be found");
    }
    if (!foundUser) {
      throw new Error("The user with the sender's Id couldn't be found");
    }

    //if there is only one member at the time of the leave request, delete the room and its corresponding messages entirely
    if (foundChatRoom.members.length === 1) {
      await Promise.all([
        ChatRoom.findByIdAndDelete(currentRoomId),
        Message.deleteMany({ chatRoom: foundChatRoom._id }),
      ]);
    } else {
      await Promise.all([
        //remove the id from members, and add it to exMembers
        ChatRoom.updateOne(
          { _id: currentRoomId },
          { $pull: { members: senderId }, $addToSet: { exMembers: senderId } },
        ),
        //set the currentChat to null
        User.updateOne({ _id: senderId }, { $set: { currentChat: null } }),
      ]);
      console.log("Successfully removed!");

      const foundOnlineIds = await OnlineId.find({
        userId: {
          $in: foundChatRoom.members.filter((id) => id.toString() !== senderId),
        }, //check if userId is in foundChatRoom.members array
      });
      const leftMsg = new Message({
        type: "notification",
        sender: senderId,
        chatRoom: foundChatRoom._id,
        content: `${foundUser.username} has left`,
      });

      if (foundOnlineIds) {
        foundOnlineIds.forEach((onlineId) => {
          getIo().to(onlineId.socketId).emit("decrease-member-count", {
            roomId: currentRoomId,
            memberId: senderId,
            msg: leftMsg,
          });
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: "An error occurred while leaving the room." });
  }
};
