const express = require("express");
const { createPost } = require("../controllers/post-controller");
const { authenticateRequest } = require("../middleware/authUser");
const router = express.Router();

//middleware
//now here we need to write a middleware where we need to get the Auth user Id

router.use(authenticateRequest);

router.post("/create-post", createPost);

module.exports = router;
