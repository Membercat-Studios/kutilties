const Settings = require("@models/Settings");
const Modmail = require("@models/Modmail");
const Rss = require("@models/Rss");
const logger = require("@logger");

module.exports = async (client) => {
  try {
    let [settings, rss, modmail] = await Promise.all([
      Settings.findOne(),
      Rss.findOne(),
      Modmail.findOne(),
    ]);

    if (!settings) {
      logger.warn("Settings document not found in database");
      settings = new Settings();
      await settings.save();
      logger.info("Created new Settings document with default values");
    }

    if (!rss) {
      logger.warn("RSS document not found in database");
      rss = new Rss({
        guildId: client.guilds.cache.first().id,
      });
      await rss.save();
      logger.info("Created new RSS document with default values");
    }

    if (!modmail) {
      logger.warn("Modmail document not found in database");
      modmail = new Modmail({
        guildId: client.guilds.cache.first().id,
      });
      await modmail.save();
      logger.info("Created new Modmail document with default values");
    }
  } catch (error) {
    logger.error(error);
  }
};
