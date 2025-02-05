const Modmail = require("../../utils/modmail");
const { ChannelType } = require("discord.js");

module.exports = async (client, message) => {
  if (message.author.bot || message.channel.type !== ChannelType.DM) return;

  if (!client.modmailCooldowns) {
    client.modmailCooldowns = new Map();
  }

  const cooldownTime = 5000;
  const currentTime = Date.now();
  const userCooldown = client.modmailCooldowns.get(message.author.id);

  if (userCooldown && currentTime - userCooldown < cooldownTime) {
    return;
  }

  client.modmailCooldowns.set(message.author.id, currentTime);

  const modmail = new Modmail(client);
  await modmail.handleDMResponse(message);
};
