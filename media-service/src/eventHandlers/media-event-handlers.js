const Media = require("../models/Media"); // Adjust path based on your project structure
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
  console.log("EventComing:", event);
  const { postId, mediaIds } = event;

  if (!mediaIds || mediaIds.length === 0) {
    logger.warn(`No mediaIds found for post ${postId}`);
    return;
  }

  try {
    console.log("Fetching media for IDs:", mediaIds);
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    console.log("Media Found:", mediaToDelete);

    if (!mediaToDelete.length) {
      logger.warn(`No media found in DB for IDs: ${mediaIds}`);
      return;
    }

    for (const media of mediaToDelete) {
      console.log(`Deleting media from Cloudinary: ${media.publicId}`);
      await deleteMediaFromCloudinary(media.publicId);

      console.log(`Deleting media from MongoDB: ${media._id}`);
      await Media.findByIdAndDelete(media._id);

      logger.info(`Deleted media ${media._id} associated with post ${postId}`);
    }

    logger.info(`Successfully processed media deletion for post ${postId}`);
  } catch (err) {
    logger.error("Error occurred while deleting media:", err);
  }
};

module.exports = { handlePostDeleted };
