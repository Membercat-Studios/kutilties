const bluesky = require("@utils/rss/bluesky");
const instagram = require("@utils/rss/instagram");
const youtube = require("@utils/rss/youtube");
const Settings = require("@models/Settings");
const logger = require("@logger");

module.exports = async (client) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      logger.warn("Settings DB doesn't exist, try restarting the bot");
      return;
    }

    setInterval(async () => {
      await bluesky.parse(client);
      // await instagram.parse(client);
      // await youtube.parse(client);
    }, settings.rssIntervalMs ?? 300_000);
  } catch (error) {
    logger.error(error);
  }
};
