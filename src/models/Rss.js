const { Schema, model } = require("mongoose");

const platformSchema = new Schema({
  accountId: { type: String, required: true },
  lastPostId: { type: String, required: true },
});

const rssSchema = new Schema({
  guildId: { type: String, required: true },
  bluesky: {
    type: [platformSchema],
    default: [],
  },
  youtube: {
    type: [platformSchema],
    default: [],
  },
  instagram: {
    type: [platformSchema],
    default: [],
  },
});

module.exports = model("bot_rss", rssSchema);
