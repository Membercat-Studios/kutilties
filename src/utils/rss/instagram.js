const Parser = require("rss-parser");
const Rss = require("../../models/Rss.js");
const Settings = require("../../models/Settings.js");
const { EmbedBuilder } = require("discord.js");
const logger = require("@logger");

async function parse(client) {
  try {
    const rss = await Rss.findOne();
    const settings = await Settings.findOne();
    const parser = new Parser();

    if (rss.instagram && rss.instagram.length > 0) {
      for (const instagramAccount of rss.instagram) {
        if (!settings || !settings.instagram.enabled) {
          logger.warn("Instagram RSS is not enabled. Skipping...");
          continue;
        }

        const { accountId, lastPostId } = instagramAccount;
        const feedUrl = `https://api.apify.com/v2/datasets/${accountId}/items?clean=true&format=rss`;
        const feed = await parser.parseURL(feedUrl);
        const latestPost = feed.items[0];

        if (!latestPost) {
          logger.warn(`No posts found for Instagram account: ${accountId}`);
          continue;
        }

        if (!settings) {
          logger.warn("Settings DB doesn't exist, try restarting the database");
          continue;
        }

        const channel = client.channels.cache.get(settings.postChannelId);
        if (!channel) {
          logger.error(`Posts channel ${settings.postChannelId} not found`);
          continue;
        }

        if (latestPost.guid !== lastPostId) {
          instagramAccount.lastPostId = latestPost.guid;
          await rss.save();

          const imageUrl = latestPost.image || null;

          const embed = new EmbedBuilder()
            .setAuthor({ name: latestPost.creator })
            .setDescription(latestPost.caption || latestPost.contentSnippet)
            .setFooter({ text: "Instagram" })
            .setColor("Purple")
            .setTimestamp();

          if (imageUrl) {
            embed.setImage(imageUrl);
          }

          const message = `Hey <@&1142942005169754173>, **${latestPost.creator}** just posted on Instagram! Go check it out!\n<${latestPost.link}>`;
          await channel.send({ content: message, embeds: [embed] });

          logger.info(
            `Announced new Instagram post from channel: ${latestPost.creator}`
          );
        }
      }
    } else {
      logger.warn("No Instagram accounts found in RSS Parser model");
    }
  } catch (error) {
    logger.error(error);
  }
}

module.exports = { parse };
