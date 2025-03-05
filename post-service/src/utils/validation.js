const Joi = require("joi");

const validationCreatePost = (data) => {
  const schema = Joi.object({
    content: Joi.string().min(3).max(5000).required(),
    mediaIds: Joi.array(),
  });

  return schema.validate(data);
};

module.exports = { validationCreatePost };
