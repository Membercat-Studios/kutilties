const cache = require("@cache");
const logger = require("@logger");

let count = 0;

module.exports = () => {
  logger.info("Cache cleanup process started. Runs every 1 minute...");

  setInterval(async () => {
    try {
      await cache.cleanUp();
      count++;

      if (count % 10 === 0) {
        logger.success(`Cache cleared 10 times (1 clear per minute)`);
      } else {
        logger.debug(`Cache cleanup running... (${count} clears so far)`);
      }
    } catch (error) {
      logger.error(`Failed to clean cache: ${error}`);
    }
  }, 60 * 1000); // 1 minute
};
