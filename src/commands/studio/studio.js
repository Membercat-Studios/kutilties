const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { teamInfo, projectInfo } = require("@utils/modrinth-api");
const logger = require("@logger");
const cache = require("@cache");

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

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "info") {
        const team = await teamInfo();
        if (!team) {
          return interaction.reply({
            content:
              "Failed to fetch studio information. Please try again later.",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("Membercat Studios")
          .setDescription(team.description || "No description available")
          .setThumbnail(team.icon_url || null)
          .addFields([
            {
              name: "Projects",
              value: `${team.projects?.length || 0} published projects`,
              inline: true,
            },
            {
              name: "Members",
              value: `${team.members?.length || 0} team members`,
              inline: true,
            },
            {
              name: "Created",
              value: `<t:${Math.floor(
                new Date(team.created).getTime() / 1000
              )}:R>`,
              inline: true,
            },
          ])
          .setColor("#00ff00")
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("View on Modrinth")
            .setURL(`https://modrinth.com/organization/membercat`)
            .setStyle(ButtonStyle.Link)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row],
        });
      }

      if (subcommand === "project") {
        const projectId = interaction.options.getString("id");
        const project = await projectInfo(projectId);

        if (!project) {
          return interaction.reply({
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

        return interaction.reply({
          embeds: [embed],
          components: [row],
        });
      }
    } catch (error) {
      logger.error("Error in studio command:", error);
      return interaction.reply({
        content: "An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  },
};
