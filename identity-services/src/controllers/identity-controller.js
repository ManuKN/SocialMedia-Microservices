//user registration
const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validationRegistration } = require("../utils/validation");

const registerUser = async (req, res) => {
  logger.info("Registration endpoint Hit...");
  try {
    //validation of Schema
    const { error } = validationRegistration(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password, username } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exist");
      return res.status(400).json({
        success: false,
        message: "User already exist",
      });
    }
    user = new User({ username, email, password });
    try {
      await user.save();
      logger.info("User saved successfully");
    } catch (error) {
      logger.error("Error saving user:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }

    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    logger.error("User registration error", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//user Login

//refresh token

//logout

module.exports = { registerUser };
