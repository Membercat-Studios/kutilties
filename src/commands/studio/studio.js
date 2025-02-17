const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  teamInfo,
  teamProjects,
  projectInfo,
  teamMembers,
} = require("@utils/modrinth-api");
const logger = require("@logger");
const cache = require("@cache");
const Settings = require("@models/Settings");

const CACHE_KEYS = {
  TEAM_PROJECTS: "membercat_team_projects",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("studio")
    .setDescription("Get information about Membercat Studios")
    .addSubcommand((subcommand) =>
      subcommand.setName("info").setDescription("View studio information")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("project")
        .setDescription("View information about a specific project")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("The project ID or slug")
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction, client) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "info") {
        const settings = await Settings.findOne();

        let projectsData = cache.get(CACHE_KEYS.TEAM_PROJECTS);
        let membersData = cache.get("modrinth_team_members");

        if (!projectsData) {
          projectsData = await teamProjects();
          if (projectsData) {
            cache.set(CACHE_KEYS.TEAM_PROJECTS, projectsData, 5 * 60 * 1000);
          }
        }

        if (!membersData) {
          membersData = await teamMembers();
          if (membersData) {
            cache.set("modrinth_team_members", membersData, 5 * 60 * 1000);
          }
        }

        if (!membersData || !projectsData) {
          return interaction.editReply({
            content: "Failed to fetch studio data. Please try again later.",
            ephemeral: true,
          });
        }

        const teamMembersList = membersData
          .map(
            (member) =>
              `[${member.user.username}](https://modrinth.com/user/${member.user.id})`
          )
          .join("\n");

        const projects = projectsData
          .map(
            (project) =>
              `[${project.name}](https://modrinth.com/project/${project.slug})`
          )
          .join("\n");

        const totalDownloads = projectsData
          .map((project) => project.downloads)
          .reduce((a, b) => a + b, 0)
          .toLocaleString();

        const embed = new EmbedBuilder()
          .setTitle("Membercat Studios")
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
          .setColor(settings.bot.color || "White")
          .setDescription(
            `Welcome to Membercat Studios! Here, we release quality resources into the world via Modrinth.`
          )
          .addFields(
            {
              name: "Projects",
              value: projects || "No projects found",
              inline: true,
            },
            {
              name: "Meet the Team",
              value: teamMembersList || "No team members found",
              inline: true,
            },
            {
              name: "Our Modrinth Page",
              value: `[Found Here](https://modrinth.com/organization/membercat)`,
              inline: true,
            },
            {
              name: "Total Downloads",
              value: totalDownloads,
              inline: true,
            },
            {
              name: "Project Count",
              value: `${projectsData.length}`,
              inline: true,
            }
          )
          .setFooter({
            text: `Membercat Studios`,
            iconURL: client.user.displayAvatarURL(),
          });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("View on Modrinth")
            .setURL(`https://modrinth.com/organization/membercat`)
            .setStyle(ButtonStyle.Link)
        );

        return interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }

      if (subcommand === "project") {
        const projectId = interaction.options.getString("id");
        const cacheKey = `modrinth_project_${projectId}`;

        let project = cache.get(cacheKey);
        if (!project) {
          project = await projectInfo(projectId);
          if (project) {
            cache.set(cacheKey, project, 5 * 60 * 1000);
          }
        }

        if (!project) {
          return interaction.editReply({
            content:
              "Failed to fetch project information. Please try again later.",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(project.title)
          .setDescription(project.description)
          .setThumbnail(project.icon_url || null)
          .addFields([
            {
              name: "Downloads",
              value: project.downloads?.toLocaleString() || "0",
              inline: true,
            },
            {
              name: "Followers",
              value: project.followers?.toLocaleString() || "0",
              inline: true,
            },
            {
              name: "Categories",
              value: project.categories?.join(", ") || "None",
              inline: true,
            },
            {
              name: "Game Versions",
              value: project.game_versions?.join(", ") || "None",
              inline: false,
            },
            {
              name: "Last Updated",
              value: `<t:${Math.floor(
                new Date(project.updated).getTime() / 1000
              )}:R>`,
              inline: true,
            },
          ])
          .setColor("#00ff00")
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("View on Modrinth")
            .setURL(`https://modrinth.com/project/${project.slug}`)
            .setStyle(ButtonStyle.Link)
        );

        return interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }
    } catch (error) {
      logger.error(`Error in studio command: ${error}`);
      return interaction.editReply({
        content: "An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  },
};
