const Parser = require("rss-parser");
const Rss = require("../../models/Rss.js");
const Settings = require("../../models/Settings.js");
const logger = require("@logger");

async function parse(client) {
  try {
    const rss = await Rss.findOne();
    const settings = await Settings.findOne();
    const parser = new Parser();

    if (rss.bluesky && rss.bluesky.length > 0) {
      for (const blueskyAccount of rss.bluesky) {
        if (!settings || !settings.bluesky.enabled) {
          logger.warn("BlueSky RSS is not enabled. Skipping...");
          continue;
        }

        const { accountId, lastPostId } = blueskyAccount;
        const feedUrl = `https://bsky.app/profile/did:plc:${accountId}/rss`;
        const feed = await parser.parseURL(feedUrl);
        const latestPost = feed.items[0];

        if (!latestPost) {
          logger.warn(`No posts found for Bluesky account: ${accountId}`);
          continue;
        }

        if (!settings) {
          logger.warn("Settings DB doesn't exist, try restarting the bot");
          continue;
        }

        const channel = client.channels.cache.get(settings.postChannelId);
        if (!channel) {
          logger.error(
            `Announcement channel ${settings.postChannelId} not found`
          );
          continue;
        }

        if (latestPost.guid !== lastPostId) {
          blueskyAccount.lastPostId = latestPost.guid;
          await rss.save();

          const creator = latestPost.link.split("/")[4];
          const message = `Hey <@&1142942005169754173>, **${creator}** just posted on Bluesky! Go check it out!\n${latestPost.link}`;
          await channel.send({ content: message });

          logger.info(`Announced new Bluesky post from channel: ${creator}`);
        }
      }
    } else {
      logger.warn("No Bluesky accounts found in RSS Parser model");
    }
  } catch (error) {
    logger.error(error);
  }
}

module.exports = { parse };
