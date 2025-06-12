const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../src/utils/logger");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const routes = require("../src/routes/identity-service");
const errorHandler = require("./middleware/errorHandler");
const app = express();

const PORT = process.env.PORT || 3001;
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

//DDos protection and rate limiting
const RateLimit = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  RateLimit.consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP:${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many Requests ,  please try again later",
      });
    });
});

//IP based rate limiting for sensitivend points
const sensitiveEndPoints = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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
app.use("/api/auth/register", sensitiveEndPoints);

//Routes
app.use("/api/auth", routes);

//error Handler
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Identity service running on port ${PORT}`);
});


//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", {
    promise,
    reason: JSON.stringify(reason),
  });
});
