const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const logger = require("@logger");
const Rss = require("@models/Rss");
const Settings = require("@models/Settings");
const cache = require("@cache");

const CACHE_KEYS = {
  SETTINGS: (guildId) => `bluesky_settings_${guildId}`,
  RSS: (guildId) => `bluesky_rss_${guildId}`,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bluesky")
    .setDescription("Manage Bluesky feeds")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("View the current Bluesky account ID list.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a Bluesky account to track.")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription(
              "The ID of the account to track (e.g., @username.bsky.social)"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a Bluesky account from tracking.")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("The ID of the account to remove")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Toggle Bluesky feed tracking on/off")
    ),

  async execute(interaction) {
    const cmd = interaction.options.getSubcommand();

    try {
      let settings = cache.get(CACHE_KEYS.SETTINGS(interaction.guildId));
      let rss = cache.get(CACHE_KEYS.RSS(interaction.guildId));

      if (!settings || !rss) {
        [settings, rss] = await Promise.all([
          Settings.findOne(),
          Rss.findOne({ guildId: interaction.guild.id }),
        ]);

        if (settings) {
          cache.set(
            CACHE_KEYS.SETTINGS(interaction.guildId),
            settings,
            5 * 60 * 1000
          );
        }
        if (rss) {
          cache.set(CACHE_KEYS.RSS(interaction.guildId), rss, 5 * 60 * 1000);
        }
      }

      if (!settings || !rss) {
        return interaction.reply({
          content:
            "Unable to continue, please alert an admin or check the bot console!",
          ephemeral: true,
        });
      }

      switch (cmd) {
        case "list":
          return handleList(interaction, settings);
        case "add":
          return handleAdd(interaction, settings);
        case "remove":
          return handleRemove(interaction, settings);
        case "toggle":
          return handleToggle(interaction, settings);
      }
    } catch (error) {
      logger.error("Error in bluesky command:", error);
      return interaction.reply({
        content: "An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  },
};

async function handleList(interaction, settings) {
  const { accounts, enabled } = settings.features.bluesky;

  const embed = new EmbedBuilder()
    .setTitle("📱 Bluesky Feed Tracking")
    .setColor(settings.bot.color)
    .setDescription(`Status: ${enabled ? "Enabled" : "Disabled"}`)
    .addFields({
      name: "Tracked Accounts",
      value:
        accounts.length > 0
          ? accounts.map((account) => `• ${account.id}`).join("\n")
          : "No accounts are being tracked.",
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleAdd(interaction, settings) {
  if (!settings.features.bluesky.enabled) {
    return interaction.reply({
      content:
        "Bluesky tracking is currently disabled. Enable it first using `/bluesky toggle`",
      ephemeral: true,
    });
  }

  const id = interaction.options.getString("id");
  const accounts = settings.features.bluesky.accounts;

  if (
    accounts.some((account) => account.id.toLowerCase() === id.toLowerCase())
  ) {
    return interaction.reply({
      content: "This account is already being tracked.",
      ephemeral: true,
    });
  }

  accounts.push({ id });
  settings.markModified("features.bluesky.accounts");
  await settings.save();

  cache.set(CACHE_KEYS.SETTINGS(interaction.guildId), settings, 5 * 60 * 1000);

  return interaction.reply({
    content: `Successfully added ${id} to tracking list.`,
    ephemeral: true,
  });
}

async function handleRemove(interaction, settings) {
  const id = interaction.options.getString("id");
  const accounts = settings.features.bluesky.accounts;

  const accountIndex = accounts.findIndex(
    (account) => account.id.toLowerCase() === id.toLowerCase()
  );

  if (accountIndex === -1) {
    return interaction.reply({
      content: "Account not found in tracking list.",
      ephemeral: true,
    });
  }

  accounts.splice(accountIndex, 1);
  settings.markModified("features.bluesky.accounts");
  await settings.save();

  cache.set(CACHE_KEYS.SETTINGS(interaction.guildId), settings, 5 * 60 * 1000);

  return interaction.reply({
    content: `Successfully removed ${id} from tracking list.`,
    ephemeral: true,
  });
}

async function handleToggle(interaction, settings) {
  settings.features.bluesky.enabled = !settings.features.bluesky.enabled;
  settings.markModified("features.bluesky");
  await settings.save();

  cache.set(CACHE_KEYS.SETTINGS(interaction.guildId), settings, 5 * 60 * 1000);

  return interaction.reply({
    content: `Bluesky tracking has been ${
      settings.features.bluesky.enabled ? "enabled" : "disabled"
    }.`,
    ephemeral: true,
  });
}
