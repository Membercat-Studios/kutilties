const cache = require("@cache");
const logger = require("@logger");

let count = 0;

module.exports = () => {
  logger.info("Cache cleanup process started. Runs every 5 seconds...");

  setInterval(async () => {
    try {
      await cache.cleanUp();
      count++;

      if (count % 50 === 0) {
        logger.success(`Cache cleared 50 times (1 clear per 5 seconds)`);
      }
    } catch (error) {
      logger.error(`Failed to clean cache: ${error}`);
    }
  }, 5 * 1000); // 5 seconds
};
