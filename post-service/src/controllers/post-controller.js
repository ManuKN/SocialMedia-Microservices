const Post = require("../models/Post");
const logger = require("../utils/logger");
const { validationCreatePost } = require("../utils/validation");

//So this fucntion is inValidate the redis when ur creates new posts

async function inValidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  if (cachedKey) {
    await req.redisClient.del(cachedKey);
  }
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

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

    await newlyCreatedPost.save();

    //inValidate or deleting the redis cached data if user creates new posts
    await inValidatePostCache(req, newlyCreatedPost._id.toString());

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;

    //here we r getting the cahcheddata if that exists
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoofPosts = await Post.countDocuments();

    const results = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoofPosts / limit),
      totalPosts: totalNoofPosts,
    };

    //now if now data is cached in the redis we need to cache the data
    //setex stores the values with expiration time
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));
    res.json(results);
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
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const postbyId = await Post.findById(postId);
    if (!postbyId) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(postbyId));
    res.json(postbyId);
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
    const postId = req.params.id;
    const postTodelete = await Post.findByIdAndDelete(postId);
    if (!postTodelete) {
      return res.status(404).json({
        success: false,
        message: "No post found to delete",
      });
    }

    //inValidate or deleting the redis cached data if user tries to delete same delete(alredy deleted post)
    await inValidatePostCache(req, postTodelete._id.toString());

    res.status(202).json({
      success: true,
      data: postTodelete,
    });
  } catch (err) {
    logger.error("Error deleting post", err);
    res.status(500).json({
      success: false,
      message: "Error deleting post by Id",
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
