const express = require('express');
const multer = require('multer');
const { authenticateRequest } = require("../middleware/authUser");
const { uploadMedia, getAllMedias } = require("../controllers/media-controllers");
const logger = require("../utils/logger");

const router = express.Router();

//configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
}).single('file');

router.post('/upload', authenticateRequest, (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            logger.error('Multer error while uploading :', err)
            return res.status(400).json({
                message: "Multer error while uploading",
                error: err.message,
                stack: err.stack
            })
        }
        else if (err) {
            logger.error('Unknown Error Occured while uploading', err)
            return res.status(500).json({
                message: "Unknown Error Occured while uploading",
                error: err.message,
                stack: err.stack
            })
        }

        if (!req.file) {
            logger.error('No file Found!')
            return res.json({
                message: "No file Found!",
            })
        }
        next()
    })
} , uploadMedia)

router.get("/getmedias" , authenticateRequest , getAllMedias)

module.exports = router;