const Post = require("../models/Post");
const logger = require("../utils/logger");
const { validationCreatePost } = require("../utils/validation");

const createPost = async (req, res) => {
  logger.info("Hitting createPost endpoint");
  try {
    //validation of Schema
    const { error } = validationCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId, // here how we r getting userid is like -> every authenticated user only can access this servies which means only logged in user which also means we can some how manage to get the userid right.
      content,
      mediaIds: mediaIds || [],
    });
    res.status(201).json({
      success: true,
      message: "Post Created successfully",
      data: newlyCreatedPost,
    });
  } catch (err) {
    logger.error("Error creating post", err);
    res.status(500).json({
      success: false,
      message: "Error creating Post",
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info("Hitting getAllPosts endpoint");
  try {
  } catch (err) {
    logger.error("Error getting All posts", err);
    res.status(500).json({
      success: false,
      message: "Error getting All posts",
    });
  }
};

const getPost = async (req, res) => {
  logger.info("Hitting getPost endpoint");
  try {
  } catch (err) {
    logger.error("Error getting post", err);
    res.status(500).json({
      success: false,
      message: "Error getting post by Id",
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("Hitting deletePost endpoint");
  try {
  } catch (err) {
    logger.error("Error deleting post", err);
    res.status(500).json({
      success: false,
      message: "Error deleting post by Id",
    });
  }
};

module.exports = { createPost };
