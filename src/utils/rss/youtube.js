const Parser = require("rss-parser");
const Rss = require("../../models/Rss.js");
const Settings = require("../../models/Settings.js");
const logger = require("@logger");

async function parse(client) {
  try {
    const rss = await Rss.findOne();
    const parser = new Parser();
    const settings = await Settings.findOne();

    if (rss.youtube && rss.youtube.length > 0) {
      for (const youtubeAccount of rss.youtube) {
        if (!settings || !settings.youtube.enabled) {
          logger.warn("YouTube RSS is not enabled. Skipping...");
          continue;
        }

        const { accountId, lastPostId } = youtubeAccount;
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${accountId}`;
        const feed = await parser.parseURL(feedUrl);
        const latestVideo = feed.items[0];

        if (!latestVideo) {
          logger.warn(`No posts found for YouTube account: ${accountId}`);
          continue;
        }

        if (!settings) {
          logger.warn("Settings DB doesn't exist, try restarting the bot");
          continue;
        }

        const uploadsChannelId = settings.uploadChannelId;
        const channel = client.channels.cache.get(uploadsChannelId);
        if (!channel) {
          logger.error(`Upload channel ${uploadsChannelId} not found`);
          continue;
        }

        if (latestVideo.id !== lastPostId) {
          youtubeAccount.lastPostId = latestVideo.id;
          await rss.save();

          const message = ``;
          await channel.send(message);

          logger.info(
            `Announced new YouTube video from channel: ${latestVideo.author}`
          );
        }
      }
    } else {
      logger.warn("No YouTube accounts found in RSS Parser model");
    }
  } catch (error) {
    logger.error(error);
  }
}

module.exports = { parse };
