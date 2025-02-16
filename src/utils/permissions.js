const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  hasPermission: async (interaction, permission) => {
    if (Array.isArray(permission)) {
      const missingPermissions = permission.filter(
        (perm) => !interaction.member.permissions.has(perm)
      );

      if (missingPermissions.length === 0) return true;

      const embed = new EmbedBuilder()
        .setTitle("❌ Missing Permissions")
        .setDescription(
          `You are missing the following required permissions:\n${missingPermissions
            .map((perm) => `\`${perm}\``)
            .join(", ")}`
        )
        .setColor("Red")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return false;
    }

    if (interaction.member.permissions.has(permission)) return true;

    const embed = new EmbedBuilder()
      .setTitle("❌ Missing Permission")
      .setDescription(
        `You do not have permission to use this command.\nRequired Permission: \`${permission}\``
      )
      .setColor("Red")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return false;
  },

  hasPermissions: async (interaction, permissions) => {
    return module.exports.hasPermission(interaction, permissions);
  },
};
