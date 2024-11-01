import mongoose from "mongoose";

const urlSchema = mongoose.Schema({
  client_requested_url: {
    type: String,
    required: [true, "Please add the long url"],
    unique: true,
  },
  short_url: {
    type: Number,
    unique: true,
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
