const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setActivity("KasaiSora", {
    type: ActivityType.Watching,
  });
};
