const logger = require("@logger");

module.exports = (client) => {
  logger.info(`${client.user.tag} is online and ready...`);
};
