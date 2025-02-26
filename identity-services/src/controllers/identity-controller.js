//user registration
const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const {
  validationRegistration,
  validationLogin,
} = require("../utils/validation");

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
const loginUser = async (req, res) => {
  logger.info("Registration endpoint Hit...");
  try {
    //validation of user Credentail
    const { error } = validationLogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Invalid User");
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid Password");
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const { refreshToken, accessToken } = await generateTokens(user);

    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (err) {
    logger.error("User registration error", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//refresh token
const UserRefreshTokon = async (req, res) => {
  logger.info("UserRefreshToken endpoint Hit...");

  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: `Invalid or expired refresh token`,
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not Found");
      return res.status(401).json({
        success: false,
        message: "User not Found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    await RefreshToken.deleteOne({ _id: storedToken._id });
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    logger.error("User refreshToken error", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//logout
const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    const deleted = await RefreshToken.deleteOne({ token: refreshToken });
    if (deleted.deletedCount > 0) {
      logger.info("Refresh token deleted for logout");
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } else {
      logger.warn("No refreshToken Found to Delete");
      res.json({
        success: false,
        message: "No user found with this RefreshToken",
      });
    }
  } catch (err) {
    logger.error("User Logout error", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = { registerUser, loginUser, UserRefreshTokon, logoutUser };
