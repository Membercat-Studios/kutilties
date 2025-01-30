const axios = require("axios");
const logger = require("@logger");
const cache = require("@cache");

const modrinth = axios.create({
  baseURL: "https://api.modrinth.com/v3",
  timeout: 10000,
  headers: {
    "User-Agent": "membercat-bot/1.0.0",
  },
});

async function projectInfo(id) {
  try {
    const cacheKey = `membercat-project-${id}`;
    let projectData = cache.get(cacheKey);

    if (!projectData) {
      const response = await modrinth.get(`/project/${id}`);

      if (!response.data) {
        logger.error("No data received from API");
      }

      projectData = response.data;

      if (!projectData.name || !projectData.id) {
        logger.error("Invalid project data received");
      }

      projectData.game_versions = projectData.game_versions || [];
      projectData.categories = projectData.categories || [];

      cache.set(cacheKey, projectData, 60 * 1000 * 7);
    }

    return projectData;
  } catch (error) {
    if (error.response?.status === 404) {
      logger.error(`Project not found: ${id}`);
    } else {
      logger.error(`Failed to get project info: ${error.message}`);
    }
    return null;
  }
}

async function teamInfo() {
  try {
    const cacheKey = `membercat-team-data`;
    let teamData = cache.get(cacheKey);

    if (!teamData) {
      const response = await modrinth.get(`/organization/membercat`);

      if (!response.data) {
        logger.error("No team data received from API");
      }

      teamData = response.data;
      cache.set(cacheKey, teamData, 60 * 1000 * 8);
    }

    return teamData;
  } catch (error) {
    logger.error(`Failed to get team info: ${error.message}`);
    return null;
  }
}

module.exports = { projectInfo, teamInfo };
