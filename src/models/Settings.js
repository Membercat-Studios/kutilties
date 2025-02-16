const { Schema, model } = require("mongoose");

const settingsSchema = new Schema({
  bot: {
    color: { type: String, default: "White" },
    footer: {
      text: { type: String, default: "membercat.exe" },
    },
    timestamp: { type: Boolean, default: true },
  },
  channels: {
    logging: { type: String, default: "1288652816830959617" },
    modmail: { type: String, default: "1336549338972946462" },
    posts: { type: String },
    uploads: { type: String },
  },
  membercat: {
    updater: {
      channel: { type: String, default: "1288652816830959617" },
      interval: { type: Number, default: 180000 }, // 3 minutes
      pingRole: { type: String, default: "1259301624266887230" },
    },
  },
  features: {
    bluesky: { enabled: { type: Boolean, default: false } },
    instagram: { enabled: { type: Boolean, default: false } },
    youtube: { enabled: { type: Boolean, default: false } },
  },
  modmail: {
    cooldownSeconds: { type: Number, default: 3600 },
  },
  rss: {
    intervalMs: { type: Number, default: 300000 }, // 5 minutes
  },
});

module.exports = model("bot_settings", settingsSchema);
