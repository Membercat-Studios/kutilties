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
      const modmail = new Modmail(client);
      if (cmd === "open") {
        if (!client.modmailCooldowns) {
          client.modmailCooldowns = new Map();
        }

        const cooldownTime = 5000;
        const currentTime = Date.now();
        const userCooldown = client.modmailCooldowns.get(interaction.user.id);

        if (userCooldown && currentTime - userCooldown < cooldownTime) {
          return interaction.reply({
            content: "Please wait some time before sending another command.",
            ephemeral: true,
          });
        }

        client.modmailCooldowns.set(interaction.user.id, currentTime);
        await modmail.open(interaction, client);
      } else if (cmd === "close") {
        await modmail.close(interaction);
      } else if (cmd === "respond") {
        await modmail.respond(interaction);
      } else if (cmd === "resolve") {
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
