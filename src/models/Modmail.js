const { Schema, model } = require("mongoose");

const modmailSchema = new Schema({
  totalCount: { type: Number, default: 0 },
  guildId: { type: String, required: true },
  modmails: [
    {
      id: { type: String },
      author: { type: String },
      channelId: { type: String },
      modmailMessage: { type: String },
      status: { type: String, enum: ["open", "closed"] },
      threadId: { type: String },
      createdAt: { type: Date, default: Date.now() },
      closedAt: { type: Date, default: null },
      messages: [
        {
          id: { type: String },
          content: { type: String },
          author: { type: String },
          createdAt: { type: Date, default: Date.now() },
        },
      ],
    },
  ],
});

module.exports = model("bot_modmail", modmailSchema);
