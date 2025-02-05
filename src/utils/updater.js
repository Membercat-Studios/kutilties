const axios = require("axios");
const logger = require("@logger");
const Project = require("@models/Projects");
const config = require("@config/general");
const cache = require("@cache");
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const modrinth = axios.create({
  baseURL: "https://api.modrinth.com/v3",
  timeout: 10000,
  headers: {
    "User-Agent": "membercat-bot/1.0.0",
  },
});

const CACHE_KEYS = {
  CHANNEL: (id) => `channel-${id}-data`,
  PROJECT: (id) => `project-${id}-data`,
};

async function checkUpdates(client) {
  const startTime = Date.now();
  logger.info("Checking for Membercat Studio's updates...");

  try {
    const { data: projects } = await modrinth.get(
      "/organization/membercat/projects"
    );

    let projectsDoc =
      (await Project.findOne({})) ||
      new Project({
        totalProjects: 0,
        projects: [],
      });

    const batchSize = 3;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      await Promise.all(
        batch.map((project) => processProject(project, projectsDoc, client))
      );

      if (i + batchSize < projects.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    projectsDoc.totalProjects = projects.length;
    await projectsDoc.save();

    const duration = Date.now() - startTime;
    logger.success(`Update check completed in ${duration}ms`);
  } catch (error) {
    logger.error(`Failed to check for updates: ${error.message}`);
    if (error.response) {
      logger.debug(`API Error: ${JSON.stringify(error.response.data)}`);
    }
  }
}

async function processProject(project, projectsDoc, client) {
  try {
    const cacheKey = CACHE_KEYS.PROJECT(project.id);
    let projectData = cache.get(cacheKey);

    if (!projectData) {
      const { data } = await modrinth.get(`/project/${project.id}`);
      if (!data) {
        logger.error(`No data received for project ${project.id}`);
      }
      projectData = data;
      cache.set(cacheKey, projectData, 60 * 1000 * 5);
    }

    if (!projectData || !projectData.updated || !projectData.name) {
      logger.error(`Invalid project data for ${project.id}`);
      return;
    }

    const latestUpdateTimestamp = new Date(projectData.updated).getTime();
    const existingProject = projectsDoc.projects.find(
      (p) => p.id === project.id
    );

    if (!existingProject) {
      logger.warn(`New project found: ${projectData.name}`);
      projectsDoc.projects.push({
        id: project.id,
        lastUpdated: latestUpdateTimestamp,
      });
    } else if (existingProject.lastUpdated < latestUpdateTimestamp) {
      logger.info(`Update detected for ${projectData.name}`);
      existingProject.lastUpdated = latestUpdateTimestamp;
      await notify(client, projectData);
    }
  } catch (error) {
    logger.error(`Failed to process project ${project.id}: ${error.message}`);
  }
}

async function notify(client, project) {
  try {
    const channelKey = CACHE_KEYS.CHANNEL(config.membercat.updater.channel);
    let channel = cache.get(channelKey);

    if (!channel) {
      channel = await client.channels.cache.get(
        config.membercat.updater.channel
      );
      if (!channel) return logger.error("Notification channel not found");
      cache.set(channelKey, channel, 60 * 1000 * 10);
    }

    const latestVersion = await getLatestVersion(project.id);
    if (!latestVersion) return logger.error("Failed to get latest version");

    const embed = createUpdateEmbed(project, latestVersion, client);

    await channel.send({
      content: `<@&${config.membercat.updater.pingRole}>`,
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("View on Modrinth")
            .setURL(latestVersion.files[0].url)
        ),
      ],
    });
  } catch (error) {
    logger.error(`Failed to send notification: ${error.message}`);
  }
}

function createUpdateEmbed(project, versionData, client) {
  try {
    if (
      !project ||
      !project.name ||
      !versionData ||
      !versionData.version_number
    ) {
      logger.error("Missing required data for embed creation");
    }

    return new EmbedBuilder()
      .setTitle(project.name)
      .setDescription(
        `${project.name} was updated to ${versionData.version_number}! Go and update now!`
      )
      .setColor(config.bot.color)
      .setFooter({
        text: config.bot.footer.text,
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp(new Date(project.updated))
      .addFields([
        {
          name: "Version",
          value: versionData.version_number,
          inline: false,
        },
        {
          name: "Changelog",
          value: versionData.changelog || "No changelog available",
          inline: false,
        },
        {
          name: "Download",
          value: `[Modrinth](${versionData.files[0].url})`,
          inline: false,
        },
      ]);
  } catch (error) {
    logger.error(`Failed to create update embed: ${error.message}`);
  }
}

async function getLatestVersion(projectId) {
  try {
    const cacheKey = `version-${projectId}`;
    let versionData = cache.get(cacheKey);

    if (!versionData) {
      const { data } = await modrinth.get(`/project/${projectId}/version`);
      if (!data || !data.length) {
        logger.error("No version data received");
      }
      versionData = data[0];

      if (
        !versionData.version_number ||
        !versionData.files ||
        !versionData.files.length
      ) {
        logger.error("Invalid version data structure");
      }

      cache.set(cacheKey, versionData, 60 * 1000 * 5);
    }

    return versionData;
  } catch (error) {
    logger.error(
      `Failed to get latest version for ${projectId}: ${error.message}`
    );
    return null;
  }
}

module.exports = checkUpdates;
