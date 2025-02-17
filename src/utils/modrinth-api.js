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

const CACHE_KEYS = {
  PROJECT: (id) => `modrinth_project_${id}`,
  TEAM: "modrinth_team_membercat",
  MEMBERS: "modrinth_team_members",
  PROJECTS: "modrinth_team_projects",
};

const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
};

async function projectInfo(id) {
  try {
    const cacheKey = CACHE_KEYS.PROJECT(id);
    let projectData = cache.get(cacheKey);

    if (!projectData) {
      const response = await modrinth.get(`/project/${id}`);
      projectData = response.data;

      if (!projectData || !projectData.name || !projectData.id) {
        logger.error(`Invalid project data received for ${id}`);
        return null;
      }

      cache.set(cacheKey, projectData, CACHE_DURATION.MEDIUM);
      logger.debug(`Cached project data for ${id}`);
    }

    return projectData;
  } catch (error) {
    logger.error(`Failed to get project info: ${error.message}`);
    return null;
  }
}

async function teamInfo() {
  try {
    let teamData = cache.get(CACHE_KEYS.TEAM);

    if (!teamData) {
      const response = await modrinth.get(`/organization/membercat`);
      teamData = response.data;

      if (!teamData) {
        logger.error("Invalid team data received");
        return null;
      }

      cache.set(CACHE_KEYS.TEAM, teamData, CACHE_DURATION.LONG);
      logger.debug("Cached team data");
    }

    return teamData;
  } catch (error) {
    logger.error(`Failed to get team info: ${error.message}`);
    return null;
  }
}

async function teamMembers() {
  try {
    let membersData = cache.get(CACHE_KEYS.MEMBERS);

    if (!membersData) {
      const response = await modrinth.get(`/organization/membercat/members`);
      membersData = response.data;

      if (!membersData) {
        logger.error("Invalid members data received");
        return null;
      }

      cache.set(CACHE_KEYS.MEMBERS, membersData, CACHE_DURATION.MEDIUM);
      logger.debug("Cached team members data");
    }

    return membersData;
  } catch (error) {
    logger.error(`Failed to get team members info: ${error.message}`);
    return null;
  }
}

async function teamProjects() {
  try {
    let projectsData = cache.get(CACHE_KEYS.PROJECTS);

    if (!projectsData) {
      const response = await modrinth.get(`/organization/membercat/projects`);
      projectsData = response.data;

      if (!projectsData) {
        logger.error("Invalid projects data received");
        return null;
      }

      // Get detailed info for each project
      const detailedProjects = await Promise.all(
        projectsData.map(async (project) => {
          const details = await projectInfo(project.id);
          return details || project;
        })
      );

      cache.set(CACHE_KEYS.PROJECTS, detailedProjects, CACHE_DURATION.SHORT);
      logger.debug("Cached team projects data");
      return detailedProjects;
    }

    return projectsData;
  } catch (error) {
    logger.error(`Failed to get team projects info: ${error.message}`);
    return null;
  }
}

module.exports = { projectInfo, teamInfo, teamProjects, teamMembers };
