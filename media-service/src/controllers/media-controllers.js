const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");
const Media = require("../models/Media");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  try {
    console.log("file data", req.file);
    if (!req.file) {
      logger.error("No file found .please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;
    logger.info(`File details : name=${originalname} , type=${mimetype}`);
    logger.info("Uploading to cloudinary starting...");
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successfully . Public-Id : - ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });
    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successfully",
    });
  } catch (err) {
    logger.error("Error Uploading media", err);
    res.status(500).json({
      success: false,
      message: "Error Uploading media",
    });
  }
};

const getAllMedias = async (req , res) =>{
  try{
   const results = await Media.find({});
   if (!results) {
    logger.error("No file found .please add a file and try again!");
    return res.status(400).json({
      success: false,
      message: "No file found. Please add a file and try again!",
    });
  }
   res.status(200).json({
    success:true,
    results
   })
  }catch(err){
    logger.error("Error Getting media", err);
    res.status(500).json({
      success: false,
      message: "Error Getting media",
    });
  }
}

module.exports = { uploadMedia , getAllMedias};
