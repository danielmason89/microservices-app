import mongoose from "mongoose";

const urlSchema = mongoose.Schema({
  original_url: {
    type: String,
    required: [true, "Please add the long url"],
    unique: true,
  },
  short_url: {
    type: Number,
    unique: true,
  },
});

urlSchema.pre("save", async (next) => {
  if (!this.isNew) return next();

  try {
    const lastUrl = await this.constructor
      .findOne()
      .sort({ short_url: -1 })
      .exec();
    if (!lastUrl) {
      this.short_url = 1;
      next();
    }
    const nextShortUrl = lastUrl.short_url + 1;
    this.short_url = nextShortUrl;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Url", urlSchema);
