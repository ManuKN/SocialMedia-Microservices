const Search = require("../models/Search");
const logger = require("../utils/logger");

const handlePostCreation = async (event) => {
  console.log("EventComing:", event);
  try {
    const newltCreatedPost = await Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newltCreatedPost.save();
    logger.info(
      `Successfully created post in Search service ${event.postId} with post id of ${newltCreatedPost._id}`
    );
  } catch (err) {
    logger.error("Error creating post in search service:", err);
  }
};

const handleDeletingPost = async (event) => {
  try {
    await Search.deleteOne({ postId: event.postId });
    logger.info(
      `Successfully deleted post in Search service of post Id : ${event.postId}`
    );
  } catch (err) {
    logger.error("Error deleting post in Search service", err);
    res.status(500).json({
      success: false,
      message: "Error deleting post by Id in Search service",
    });
  }
};

module.exports = { handlePostCreation, handleDeletingPost };
