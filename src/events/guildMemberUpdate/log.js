const { EmbedBuilder } = require("discord.js");
const logger = require("@logger");
const config = require("@config/general");
const cache = require("@cache");

module.exports = async (client, oldMember, newMember) => {
  try {
    let channel;
    const cacheKey = `channel-${config.logging.channel}-data`;

    if (!cache.has(cacheKey)) {
      channel = await newMember.guild.channels.cache.get(
        config.logging.channel
      );
      cache.set(cacheKey, channel, 60 * 1000 * 5); // 5 minutes
    } else {
      channel = cache.get(cacheKey);
    }

    if (!channel) return logger.error("Logging channel not found");

    if (oldMember.nickname !== newMember.nickname) {
      channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`👤 ${newMember.user.username} | Nickname Changed`)
            .setDescription(`A user has changed their nickname!`)
            .setColor(config.bot.color)
            .setFooter({
              text: config.bot.footer.text,
              iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp()
            .addFields(
              {
                name: "🕒 Timestamp",
                value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true,
              },
              {
                name: "👤 Old Nickname",
                value: oldMember.nickname || "None",
                inline: true,
              },
              {
                name: "👤 New Nickname",
                value: newMember.nickname || "None",
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
