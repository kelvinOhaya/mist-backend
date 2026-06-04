//function for the connection to MongoDB

//import mongoose and the environment variables
const mongoose = require("mongoose");
const { MONGO_URI } = require("../config/env");

const connectDB = async () => {
  try {
    const connectionString = MONGO_URI; //get the connection string
    await mongoose.connect(connectionString); // connect to mongoDB with that string
    console.log("Connected to MongoDB"); //once connected, log the following message into the console.
  } catch (error) {
    //log the error and exit whatever program node.js is running currently, the argument of "1" indicating a failure
    console.log("Error: Failed to Connect to MongoDB", error);
    process.exit(1);
  }
};

//export this function
module.exports = connectDB;
