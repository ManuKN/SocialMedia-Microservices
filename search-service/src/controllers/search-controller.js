const logger = require("../utils/logger");
const Search = require("../models/Search");


//implement caching here max limit of 2 to 3 mins
const searchPostController = async (req, res) => {
  logger.info("Hitting the search API");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    logger.error("Error while Searching Post", err);
    res.status(500).json({
      success: false,
      message: "Error while Searching Post",
    });
  }
};

module.exports = { searchPostController };
