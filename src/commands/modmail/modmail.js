const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { Settings } = require("../../models/Settings");
const logger = require("@logger");
const cache = require("@cache");
const Modmail = require("../../utils/modmail");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modmail")
    .setDescription("KasaiSora Universe modmails")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("open")
        .setDescription(
          "Open a modmail with the KasaiSora Universe moderation team"
        )
        .addStringOption((option) =>
          option
            .setName("subject")
            .setDescription("The subject of the modmail")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("The message to send to the moderation team")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("close").setDescription("Close a modmail")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all open modmails.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("settings")
        .setDescription("Change the modmail configuration.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("respond")
        .setDescription("Respond to a modmail thread")
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Your response message")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("resolve")
        .setDescription("Resolve and close a modmail thread")
        .addStringOption((option) =>
          option
            .setName("resolution")
            .setDescription("The resolution message")
            .setRequired(true)
        )
    ),
  async execute(interaction, client) {
    const cmd = interaction.options.getSubcommand();

    try {
      if (cmd === "open") {
        const modmail = new Modmail(client);
        await modmail.open(interaction, client);
      } else if (cmd === "close") {
        const modmail = new Modmail(client);
        await modmail.close(interaction);
      } else if (cmd === "respond") {
        const modmail = new Modmail(client);
        await modmail.respond(interaction);
      } else if (cmd === "resolve") {
        const modmail = new Modmail(client);
        await modmail.resolve(interaction);
      }
    } catch (error) {
      logger.error(error);
      return interaction.reply({
        content: `An error occurred while executing /${interaction.commandName} ${cmd}. Please try again later.`,
        ephemeral: true,
      });
    }
  },
};
