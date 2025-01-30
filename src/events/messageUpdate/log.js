const { EmbedBuilder } = require("discord.js");
const config = require("@config/general");
const logger = require("@logger");
const cache = require("@cache");

module.exports = async (client, message, newMessage) => {
  if (message.author.bot) return;
  let channel;
  const cacheKey = `channel-${config.logging.channel}-data`;

  if (!cache.has(cacheKey)) {
    channel = await client.channels.cache.get(config.logging.channel);
    cache.set(cacheKey, channel, 60 * 1000 * 5); // 5 minutes
  } else {
    channel = cache.get(cacheKey);
  }

  if (!channel) return logger.error("Logging channel not found");

  try {
    if (message.content !== newMessage.content) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${message.author.username} | Messaged Edited`)
            .setDescription(
              `A message has been edited in ${message.channel} by ${message.author}`
            )
            .setColor(config.bot.color)
            .setFooter({
              text: config.bot.footer.text,
              iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp()
            .addFields(
              {
                name: "🔗 Link",
                value: `[View message](${message.url})`,
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
                name: "📜 Old Content",
                value: message.content
                  ? `>>> ${message.content}`
                  : "*[No Content]*",
                inline: false,
              },
              {
                name: "📜 New Content",
                value: newMessage.content
                  ? `>>> ${newMessage.content}`
                  : "*[No Content]*",
                inline: false,
              }
            ),
        ],
      });
    } else if (message.pinned !== newMessage.pinned) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${message.author.username} | Messaged Pinned`)
            .setDescription(
              `A message has been pinned in ${message.channel} by ${message.author}`
            )
            .setColor(config.bot.color)
            .setFooter({
              text: config.bot.footer.text,
              iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp()
            .addFields(
              {
                name: "🔗 Link",
                value: `[View message](${message.url})`,
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
              }
            ),
        ],
      });
    }
  } catch (error) {
    logger.error(error);
  }
};
