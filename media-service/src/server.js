require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3003;

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
app.use("/api/media/upload", sensitiveEndPoints);

//routes -> pass redis client to routes
app.use("/api/media", mediaRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`Media service running on port ${PORT}`);
});

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", {
        promise,
        reason: JSON.stringify(reason),
    });
});
