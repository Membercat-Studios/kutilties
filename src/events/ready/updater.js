const checkUpdates = require("@utils/updater");
const logger = require("@logger");
const config = require("@config/general");

module.exports = (client) => {
  logger.info("Starting project updater...");
  checkUpdates(client);
  setInterval(() => checkUpdates(client), config.membercat.updater.interval);
};
