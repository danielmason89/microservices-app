import mongoose from "mongoose";

const urlSchema = mongoose.Schema({
  long_url: {
    type: String,
  },
  short_url: {
    type: Number,
  },
});

urlSchema.pre("save", async function (next) {
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

const Url = mongoose.model("Url", urlSchema);
export default Url;
