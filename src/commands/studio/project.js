const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { projectInfo } = require("@utils/modrinth-api");
const logger = require("@logger");
const config = require("@config/general");
const cache = require("@cache");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("project")
    .setDescription("Get information about a project")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The ID/slug of the project")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    try {
      const id = interaction.options.getString("id");
      const cacheKey = `membercat-project-${id}`;
      let project = cache.get(cacheKey);

      if (!project) {
        project = await projectInfo(id);
        if (!project) {
          logger.error("Project not found or API error occurred");
        }
        cache.set(cacheKey, project, 60 * 1000 * 8); // cache for 8 minutes
      }

      if (!project.game_versions || !Array.isArray(project.game_versions)) {
        logger.error("Invalid project data: missing game versions");
      }

      const supports = project.game_versions.join(", ");

      const embed = new EmbedBuilder()
        .setTitle(`Information | ${project.name}`)
        .setURL(project.url)
        .setThumbnail(project.icon_url)
        .setColor(
          project.color
            ? project.color.toString(16).padStart(6, "0")
            : config.bot.color
        )
        .setDescription(project.summary)
        .setFooter({
          text: config.bot.footer.text,
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .addFields(
          {
            name: "Statistics",
            value: `**${project.downloads}** downloads, **${project.followers}** followers`,
          },
          {
            name: "Supports",
            value: supports || "No version information available",
            inline: true,
          },
          {
            name: "Slug",
            value: project.slug || "N/A",
            inline: true,
          },
          {
            name: "Categories",
            value: project.categories?.join(", ") || "No categories",
            inline: true,
          }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Failed to get project info: ${error.message}`);
      await interaction.reply({
        content: "Failed to get project info. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
