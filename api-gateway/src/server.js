const express = require("express");
require("dotenv").config();
const logger = require("../src/utils/logger");
const helmet = require("helmet");
const cors = require("cors");
const Redis = require("ioredis");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

//redis server creation
const redisClient = new Redis(process.env.REDIS_URL);

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

const RatelimitOptions = rateLimit({
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

app.use(RatelimitOptions);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

//  api-gateway -> /v1/auth/register -> 3000
//  identity -> /api/auth/register -> 3001

// so now using proxy we havce to redirevt from port 3000 to 3001 when user trys to hit /v1/auth/register api in 3000

//localhost:3000/v1/auth/register -> localhost:3001/api/auth/register

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error : ${err.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server Error",
      error: err.message,
    });
  },
};

//setting up proxy for our identity service

app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//setting up proxy for our post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Post service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//setting up proxy for our media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false, // this will amke sure that entire request is proxyed for the file uploads also
  })
);

//setting proxy for search service
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Search service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`api gateway is running on port ${PORT}`);
  logger.info(
    `Identity-service is running on Port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `Post-service is running on Port ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `Media-service is running on Port ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(
    `Search-service is running on Port ${process.env.SEARCH_SERVICE_URL}`
  );
  logger.info(`Redis URL ${process.env.REDIS_URL}`);
});
