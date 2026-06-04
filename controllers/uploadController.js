const { cloudinary } = require("../config/cloudinary");
const User = require("../models/User");
const ChatRoom = require("../models/ChatRoom");
const utils = require("../utils/utils");

//updates the user's profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const senderId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "No image file was uploaded" });
    }

    const imageUrl = req.file.secure_url || req.file.url || req.file.path;
    const public_Id = req.file.filename || req.file.public_id;

    const foundUser = await User.findById(senderId).select(
      "profilePicture members",
    );
    //console.log("Current User: ", foundUser, "\nImage Url: ", imageUrl);
    if (foundUser.profilePicture != null) {
      const existingPublicId =
        foundUser.profilePicture.public_Id ||
        foundUser.profilePicture.public_id;
      if (existingPublicId) {
        await cloudinary.uploader.destroy(existingPublicId);
      }
    }

    const newProfilePicture = { url: imageUrl, public_Id }; //now profile picture object

    //get all possible ids where other users might need to get this socket event (duplicates are expected)
    const possibleMembers = await ChatRoom.find({
      $or: [{ members: senderId }, { exMembers: senderId }],
    }).select("members");

    //make new array a set to remove duplicates
    // we want to focus on unique ids, so we'll use flat map to say so
    // why flatMap over map? Flat map *flattens all the object properties into a single array, which is useful since that's what we want.
    const uniqueMembers = [
      ...new Set(possibleMembers.flatMap((room) => room.members)),
    ];

    await Promise.all([
      User.findByIdAndUpdate(req.user.id, {
        profilePicture: newProfilePicture,
      }),
      utils.findOnlineIdsAndSend(
        //cheating a little by setting the argument to members rather than having the whole chat object
        { members: uniqueMembers },
        "update-profile-picture",
        { foundUserId: senderId, newProfilePicture },
      ),
    ]);

    return res.status(200).json({ newProfilePicture });
  } catch (error) {
    console.log("Failed to upload image to cloudinary: ", error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
};

//for updating group chat photos
exports.updateGroupProfilePicture = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No image file was uploaded" });
    }

    const imageUrl = req.file.secure_url || req.file.url || req.file.path;

    //find the chat room, and if there is an existing profile picture, destroy that in cloudinary
    const foundChatRoom = await ChatRoom.findById(roomId).select(
      "profilePicture members",
    );
    if (foundChatRoom.profilePicture != null) {
      const existingPublicId =
        foundChatRoom.profilePicture.public_Id ||
        foundChatRoom.profilePicture.public_id;
      if (existingPublicId) {
        await cloudinary.uploader.destroy(existingPublicId);
      }
    }
    //new image url
    const newProfilePicture = {
      url: imageUrl,
      public_Id: req.file.filename || req.file.public_id,
    };

    //find the corresponding onlineIds

    console.log("NEW GROUP PROFILE PIC: ", newProfilePicture, "\n");
    console.log("FOUND CHAT ROOM: ", foundChatRoom);

    foundChatRoom.profilePicture = newProfilePicture;
    await Promise.all([
      foundChatRoom.save(),
      utils.findOnlineIdsAndSend(foundChatRoom, "receive-group-photo-update", {
        roomId,
        newProfilePicture,
      }),
    ]);

    return res.status(200).json({ newProfilePicture });
  } catch (error) {
    console.log("Failed to upload the group Profile to cloudinary: ", error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
};
