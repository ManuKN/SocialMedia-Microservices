require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ } = require("./utils/rabbitmq");

const app = express();

const PORT = process.env.PORT || 3002;

//connect to mongodb
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongoDb"))
  .catch((e) => logger.error("Mongo connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);

//middlewares
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
  max: 25,
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
app.use("/api/posts/create-post", sensitiveEndPoints);

//routes -> pass redis client to routes
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

//error Handler
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`Post service running on port ${PORT}`);
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
