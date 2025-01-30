const { EmbedBuilder } = require("discord.js");
const logger = require("@logger");
const config = require("@config/general");
const cache = require("@cache");

module.exports = async (client, message) => {
  try {
    if (message.author.bot) return;
    let channel;

    const cacheKey = `channel-${config.logging.channel}-data`;
    if (!cache.has(cacheKey)) {
      channel = await message.guild.channels.cache.get(config.logging.channel);
      cache.set(cacheKey, channel, 60 * 1000 * 5); // 5 minutes
    } else {
      channel = cache.get(cacheKey);
    }

    if (!channel) return logger.error("Logging channel not found");

    channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🗑️ ${message.author.username} | Messaged Deleted`)
          .setDescription(`A message has been deleted!`)
          .setColor(config.bot.color)
          .setFooter({
            text: config.bot.footer.text,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
          })
          .setTimestamp()
          .addFields(
            {
              name: "👤 Author",
              value: `${message.author}`,
              inline: true,
            },
            {
              name: "📍 Channel",
              value: `${message.channel}`,
              inline: true,
            },
            {
              name: "🕒 Timestamp",
              value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
              inline: true,
            },
            {
              name: "📜 Message Content",
              value: message.content
                ? `>>> ${message.content}`
                : "*[No Content]*",
              inline: false,
            }
          ),
      ],
    });
  } catch (error) {
    logger.error(error);
  }
};
