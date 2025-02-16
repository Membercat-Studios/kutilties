const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Settings = require("@models/Settings");
const Modmail = require("@models/Modmail");
const logger = require("@logger");
const ModmailUtil = require("@utils/modmail");
const { hasPermissions } = require("@utils/permissions");
const cache = require("@cache");

const CACHE_KEYS = {
  SETTINGS: "settings_data",
  MODMAIL_DOC: (guildId) => `modmail_doc_${guildId}`,
  USER_COOLDOWN: (userId) => `modmail_cooldown_${userId}`,
};

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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ban")
        .setDescription("Ban a user from using modmail")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to ban from modmail")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("The reason for the ban")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unban")
        .setDescription("Unban a user from modmail")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to unban from modmail")
            .setRequired(true)
        )
    ),
  async execute(interaction, client) {
    const cmd = interaction.options.getSubcommand();

    try {
      let settings = cache.get(CACHE_KEYS.SETTINGS);
      let modmailDoc = cache.get(CACHE_KEYS.MODMAIL_DOC(interaction.guild.id));

      if (!settings || !modmailDoc) {
        [settings, modmailDoc] = await Promise.all([
          Settings.findOne(),
          Modmail.findOne({ guildId: interaction.guild.id }),
        ]);

        if (settings) {
          cache.set(CACHE_KEYS.SETTINGS, settings, 5 * 60 * 1000);
        }
        if (modmailDoc) {
          cache.set(
            CACHE_KEYS.MODMAIL_DOC(interaction.guild.id),
            modmailDoc,
            5 * 60 * 1000
          );
        }
      }

      if (!settings || !modmailDoc) {
        return interaction.reply({
          content:
            "Unable to continue, please alert an admin or check the bot console!",
          ephemeral: true,
        });
      }

      const modmail = new ModmailUtil(client);

      if (cmd === "open") {
        const currentTime = Date.now();
        const cooldownKey = CACHE_KEYS.USER_COOLDOWN(interaction.user.id);
        let lastUsed = cache.get(cooldownKey);

        if (!lastUsed) {
          lastUsed = modmailDoc.cooldowns.get(interaction.user.id);
          if (lastUsed) {
            cache.set(
              cooldownKey,
              lastUsed,
              settings.modmail.cooldownSeconds * 1000
            );
          }
        }

        const cooldownMs = settings.modmail.cooldownSeconds * 1000;

        if (lastUsed && currentTime - lastUsed.getTime() < cooldownMs) {
          const nextAvailableTime = Math.floor(
            (lastUsed.getTime() + cooldownMs) / 1000
          );
          return interaction.reply({
            content: `You can create another modmail <t:${nextAvailableTime}:R>`,
            ephemeral: true,
          });
        }

        const newCooldown = new Date();
        cache.set(cooldownKey, newCooldown, cooldownMs);
        modmailDoc.cooldowns.set(interaction.user.id, newCooldown);

        cache.set(
          CACHE_KEYS.MODMAIL_DOC(interaction.guild.id),
          modmailDoc,
          5 * 60 * 1000
        );

        await modmailDoc.save();
        await modmail.open(interaction, client);
      } else if (cmd === "close") {
        await modmail.close(interaction);
        cache.delete(CACHE_KEYS.MODMAIL_DOC(interaction.guild.id));
      } else if (cmd === "respond") {
        await modmail.respond(interaction);
      } else if (cmd === "resolve") {
        await modmail.resolve(interaction);
        cache.delete(CACHE_KEYS.MODMAIL_DOC(interaction.guild.id));
      } else if (cmd === "ban") {
        await modmail.ban(interaction);
      } else if (cmd === "unban") {
        await modmail.unban(interaction);
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
