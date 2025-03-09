require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const searchPosts = require("./routes/search-routes");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const {handlePostCreation , handleDeletingPost} = require("./eventHandlers/search-post-handlers")

const app = express();
const PORT = process.env.PORT || 3004;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongoDb"))
  .catch((e) => logger.error("Mongo connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

//homeWork implement Ip based rate limiting for sensitive endpoints

//IP based rate limiting for sensitivend points
const sensitiveEndPoints = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sentitive end point rate limit exceeded for Ip:${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many Requests ,  please try again later",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply this sentitive end point limiter to our end point
app.use("/api/search/posts", sensitiveEndPoints);

//i need to implement redis caching here⭐
app.use("/api/search", searchPosts);


//error Handler
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
     //consume all the events here
     await consumeEvent("post.created", handlePostCreation);  
     await consumeEvent("post.deleted", handleDeletingPost);   
    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}
startServer();

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", {
    promise,
    reason: JSON.stringify(reason),
  });
});

