const jwt = require("jsonwebtoken");
const { ACCESS_SECRET} = require("../config/env")

//the middleware for authentication routes that should check that the user has an accessToken before accessing the route
const authMiddleware = (req, res, next) => {
  //look for an authorization header
  const authHeader = req.headers.authorization;

  //if there is no authorization header, or it doesn't start with "Bearer " (as the header should), return a 401 error telling the user no token was provided
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  //If the token looks like "Bearer (token)", we want the token part, so we split it into an array by the space character, and get the part with the token
  const token = authHeader.split(" ")[1];

  //get the decoded jwt token and set the req.user property of the route to the decoded token. then continue to the route originally intended
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" }); // if this doesn't work, the token must be expired, so tell the user so.
  }
};

module.exports = authMiddleware;
