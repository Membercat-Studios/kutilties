const { Schema, model } = require("mongoose");

const settingsSchema = new Schema({});

module.exports = model("bot_settings", settingsSchema);
