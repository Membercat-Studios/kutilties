const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Settings = require("@models/Settings");
const logger = require("@logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Manage bot settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) =>
      group
        .setName("channels")
        .setDescription("Manage channel settings")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("set")
            .setDescription("Set a channel for the bot to use")
            .addStringOption((option) =>
              option
                .setName("type")
                .setDescription("The type of channel to set")
                .setRequired(true)
                .addChoices(
                  { name: "Logging", value: "logging" },
                  { name: "Modmail", value: "modmail" },
                  { name: "Posts", value: "posts" },
                  { name: "Uploads", value: "uploads" }
                )
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to set")
                .setRequired(true)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("updater")
        .setDescription("Manage updater settings")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("interval")
            .setDescription(
              "Set the update check interval for Membercat Studios"
            )
            .addIntegerOption((option) =>
              option
                .setName("minutes")
                .setDescription("Interval in minutes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(60)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("role")
            .setDescription(
              "Set the ping role for updates from Membercat Studios"
            )
            .addRoleOption((option) =>
              option
                .setName("role")
                .setDescription("The role to ping")
                .setRequired(true)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("features")
        .setDescription("Manage feature toggles")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("toggle")
            .setDescription("Toggle a feature")
            .addStringOption((option) =>
              option
                .setName("feature")
                .setDescription("The feature to toggle")
                .setRequired(true)
                .addChoices(
                  { name: "Bluesky", value: "bluesky" },
                  { name: "Instagram", value: "instagram" },
                  { name: "YouTube", value: "youtube" },
                  { name: "Timestamps", value: "timestamp" }
                )
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("appearance")
        .setDescription("Manage bot appearance settings")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("color")
            .setDescription("Set the bot's embed color")
            .addStringOption((option) =>
              option
                .setName("color")
                .setDescription(
                  "The color to use (hex code or basic color name)"
                )
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("footer")
            .setDescription("Set the bot's footer text")
            .addStringOption((option) =>
              option
                .setName("text")
                .setDescription("The footer text to use")
                .setRequired(true)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("intervals")
        .setDescription("Manage timing settings")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("rss")
            .setDescription("Set the RSS feed check interval")
            .addIntegerOption((option) =>
              option
                .setName("minutes")
                .setDescription("Interval in minutes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(60)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("modmail")
            .setDescription("Set the modmail cooldown")
            .addIntegerOption((option) =>
              option
                .setName("seconds")
                .setDescription("Cooldown in seconds")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(86400)
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("view").setDescription("View current settings")
    ),

  async execute(interaction, client) {
    try {
      const settings = await Settings.findOne();
      if (!settings) {
        return interaction.reply({
          content: "Settings not found. Please restart the bot.",
          ephemeral: true,
        });
      }

      const subcommandGroup = interaction.options.getSubcommandGroup();
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "view") {
        return await handleViewSettings(interaction, settings, client);
      }

      switch (subcommandGroup) {
        case "channels":
          await handleChannelSettings(interaction, settings);
          break;
        case "updater":
          await handleUpdaterSettings(interaction, settings);
          break;
        case "features":
          await handleFeatureSettings(interaction, settings);
          break;
        case "appearance":
          await handleAppearanceSettings(interaction, settings);
          break;
        case "intervals":
          await handleIntervalSettings(interaction, settings);
          break;
        default:
          return interaction.reply({
            content: "Invalid subcommand group",
            ephemeral: true,
          });
      }
    } catch (error) {
      logger.error(error);
      return interaction.reply({
        content: "An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  },
};

async function handleViewSettings(interaction, settings, client) {
  const embed = new EmbedBuilder()
    .setTitle("Bot Settings")
    .setColor(settings.bot.color)
    .setDescription("Current bot configuration")
    .addFields([
      {
        name: "Channels",
        value: `Logging: <#${settings.channels.logging}>\nModmail: <#${
          settings.channels.modmail
        }>\nPosts: ${
          settings.channels.posts ? `<#${settings.channels.posts}>` : "Not set"
        }\nUploads: ${
          settings.channels.uploads
            ? `<#${settings.channels.uploads}>`
            : "Not set"
        }`,
      },
      {
        name: "Membercat Studios Updater",
        value: `Channel: <#${settings.membercat.updater.channel}>\nInterval: ${
          settings.membercat.updater.interval / 60000
        } minutes\nPing Role: <@&${settings.membercat.updater.pingRole}>`,
      },
      {
        name: "Features",
        value: `Bluesky: ${
          settings.features.bluesky.enabled ? "✅" : "❌"
        }\nInstagram: ${
          settings.features.instagram.enabled ? "✅" : "❌"
        }\nYouTube: ${
          settings.features.youtube.enabled ? "✅" : "❌"
        }\nTimestamps: ${settings.bot.timestamp ? "✅" : "❌"}`,
      },
      {
        name: "Appearance",
        value: `Color: ${settings.bot.color}\nFooter Text: ${settings.bot.footer.text}`,
      },
      {
        name: "Intervals",
        value: `RSS Check: ${
          settings.rss.intervalMs / 60000
        } minutes\nModmail Cooldown: ${
          settings.modmail.cooldownSeconds
        } seconds`,
      },
    ])
    .setFooter({
      text: settings.bot.footer.text,
      iconURL: client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

async function handleChannelSettings(interaction, settings) {
  const type = interaction.options.getString("type");
  const channel = interaction.options.getChannel("channel");

  settings.channels[type] = channel.id;
  await settings.save();

  return interaction.reply({
    content: `Successfully set ${type} channel to ${channel}`,
    ephemeral: true,
  });
}

async function handleUpdaterSettings(interaction, settings) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "interval") {
    const minutes = interaction.options.getInteger("minutes");
    settings.membercat.updater.interval = minutes * 60000;
    await settings.save();

    return interaction.reply({
      content: `Update check interval set to ${minutes} minutes`,
      ephemeral: true,
    });
  }

  if (subcommand === "role") {
    const role = interaction.options.getRole("role");
    settings.membercat.updater.pingRole = role.id;
    await settings.save();

    return interaction.reply({
      content: `Update ping role set to ${role}`,
      ephemeral: true,
    });
  }
}

async function handleFeatureSettings(interaction, settings) {
  const feature = interaction.options.getString("feature");

  if (feature === "timestamp") {
    settings.bot.timestamp = !settings.bot.timestamp;
    await settings.save();
    return interaction.reply({
      content: `Timestamps have been ${
        settings.bot.timestamp ? "enabled" : "disabled"
      }`,
      ephemeral: true,
    });
  }

  settings.features[feature].enabled = !settings.features[feature].enabled;
  await settings.save();

  return interaction.reply({
    content: `${feature} has been ${
      settings.features[feature].enabled ? "enabled" : "disabled"
    }`,
    ephemeral: true,
  });
}

async function handleAppearanceSettings(interaction, settings) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "color") {
    const color = interaction.options.getString("color");
    // color validation
    const isHex = /^#[0-9A-F]{6}$/i.test(color);
    const isBasicColor = /^[a-zA-Z]+$/.test(color);

    if (!isHex && !isBasicColor) {
      return interaction.reply({
        content:
          "Please provide a valid hex color code (e.g., #FF0000) or basic color name (e.g., Red)",
        ephemeral: true,
      });
    }

    settings.bot.color = color;
    await settings.save();

    const embed = new EmbedBuilder()
      .setTitle("Color Updated")
      .setDescription("This is how embeds will look with the new color")
      .setColor(color);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === "footer") {
    const text = interaction.options.getString("text");
    settings.bot.footer.text = text;
    await settings.save();

    const embed = new EmbedBuilder()
      .setTitle("Footer Updated")
      .setDescription("This is how the footer will look")
      .setColor(settings.bot.color)
      .setFooter({ text: text });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleIntervalSettings(interaction, settings) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "rss") {
    const minutes = interaction.options.getInteger("minutes");
    settings.rss.intervalMs = minutes * 60000;
    await settings.save();

    return interaction.reply({
      content: `RSS feed check interval set to ${minutes} minutes`,
      ephemeral: true,
    });
  }

  if (subcommand === "modmail") {
    const seconds = interaction.options.getInteger("seconds");
    settings.modmail.cooldownSeconds = seconds;
    await settings.save();

    return interaction.reply({
      content: `Modmail cooldown set to ${seconds} seconds`,
      ephemeral: true,
    });
  }
}
