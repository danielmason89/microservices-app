import mongoose from "mongoose";

const urlSchema = mongoose.Schema({
  original_url: {
    type: String,
    required: [true, "Please add the long URL"],
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
    this.short_url = lastUrl ? lastUrl.short_url + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

const Url = mongoose.model("Url", urlSchema);
export default Url;
