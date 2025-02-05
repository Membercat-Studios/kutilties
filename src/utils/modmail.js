const ModmailSchema = require("../models/Modmail");
const { EmbedBuilder } = require("discord.js");

const config = require("@config/general");
const logger = require("@logger");
const cache = require("@cache");

class Modmail {
  constructor(client) {
    this.client = client;
    this.CACHE_TTL = 300; // 5 minutes in seconds
  }

  async open(interaction, client) {
    try {
      const subject = interaction.options.getString("subject");
      const message = interaction.options.getString("message");

      let modmail = await ModmailSchema.findOne({
        guildId: interaction.guild.id,
      });

      if (!modmail) {
        modmail = new ModmailSchema({
          guildId: interaction.guild.id,
          totalCount: 0,
          modmails: [],
        });
      }

      const existingOpenModmail = modmail.modmails.find(
        (m) => m.author === interaction.user.id && m.status === "open"
      );

      if (existingOpenModmail) {
        return interaction.reply({
          content: `You already have an open modmail (ID: ${existingOpenModmail.id}). Please wait for it to be closed before creating a new one.`,
          ephemeral: true,
        });
      }

      const modmailChannel = await interaction.guild.channels.cache.get(
        config.modmail.channel
      );

      if (!modmailChannel) {
        return interaction.reply({
          content: "No modmail channel found.",
          ephemeral: true,
        });
      }

      const modmailEmbed = new EmbedBuilder()
        .setTitle(`📬 New Modmail | ${subject}`)
        .setDescription(message)
        .setColor(config.bot.color)
        .addFields([
          {
            name: "From",
            value: `${interaction.user}`,
            inline: true,
          },
          {
            name: "Created At",
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true,
          },
          {
            name: "Status",
            value: "🟢 Open",
            inline: true,
          },
        ])
        .setFooter({
          text: `User ID: ${interaction.user.id}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      const modmailMessage = await modmailChannel.send({
        embeds: [modmailEmbed],
      });

      const modmailThread = await modmailMessage.startThread({
        name: `${subject} | ${interaction.user.username}`,
        autoArchiveDuration: 60,
      });

      const threadEmbed = new EmbedBuilder()
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(message)
        .setColor(config.bot.color)
        .setTimestamp();

      await modmailThread.send({
        embeds: [threadEmbed],
      });

      modmail.totalCount += 1;
      modmail.modmails.push({
        id: modmailMessage.id,
        author: interaction.user.id,
        channelId: modmailChannel.id,
        modmailMessage: message,
        status: "open",
        threadId: modmailThread.id,
      });

      await modmail.save();

      const dmEmbed = new EmbedBuilder()
        .setTitle("📬 Modmail Opened")
        .setDescription(
          "Your modmail has been opened. You can reply to this message to send messages to the staff team. Your messages will be forwarded to them."
        )
        .setColor(config.bot.color)
        .addFields([
          {
            name: "Subject",
            value: subject,
            inline: true,
          },
          {
            name: "Thread ID",
            value: modmailThread.id,
            inline: true,
          },
          {
            name: "How to use",
            value:
              "Simply send a message in this DM to communicate with the staff team.",
            inline: false,
          },
        ])
        .setFooter({
          text: "Your messages will be forwarded to the staff team",
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      const dmChannel = await interaction.user.createDM();
      await dmChannel.send({ embeds: [dmEmbed] });

      const modmailEntry = modmail.modmails.find(
        (m) => m.threadId === modmailThread.id
      );
      modmailEntry.dmChannelId = dmChannel.id;
      await modmail.save();

      const confirmationEmbed = new EmbedBuilder()
        .setTitle("✅ Modmail Sent Successfully")
        .setDescription(
          "Your modmail has been sent to the staff team. They will respond as soon as possible."
        )
        .setColor(config.bot.color)
        .addFields([
          {
            name: "Subject",
            value: subject,
            inline: true,
          },
          {
            name: "Thread ID",
            value: modmailThread.id,
            inline: true,
          },
        ])
        .setFooter({
          text: config.bot.footer.text,
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.reply({
        embeds: [confirmationEmbed],
        ephemeral: true,
      });
    } catch (error) {
      logger.error(error);
      return interaction.reply({
        content: "There was an error creating your modmail.",
        ephemeral: true,
      });
    }
  }

  async close(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const threadId = interaction.channel.id;

      let modmail = await ModmailSchema.findOne({
        guildId: interaction.guild.id,
        "modmails.threadId": threadId,
      });

      if (!modmail) {
        return interaction.editReply({
          content: "This channel is not a modmail thread.",
        });
      }

      const modmailEntry = modmail.modmails.find(
        (m) => m.threadId === threadId
      );

      if (!modmailEntry) {
        return interaction.editReply({
          content: "No modmail found for this thread.",
        });
      }

      if (modmailEntry.status === "closed") {
        return interaction.editReply({
          content: "This modmail is already closed.",
        });
      }

      modmailEntry.status = "closed";
      modmailEntry.closedAt = new Date();

      const channel = await interaction.guild.channels.cache.get(
        modmailEntry.channelId
      );
      if (channel) {
        const message = await channel.messages.fetch(modmailEntry.id);
        if (message) {
          const updatedEmbed = EmbedBuilder.from(message.embeds[0])
            .setColor("Red")
            .spliceFields(2, 1, {
              name: "Status",
              value: "🔴 Closed",
              inline: true,
            });

          await message.edit({ embeds: [updatedEmbed] });
        }
      }

      const closeEmbed = new EmbedBuilder()
        .setTitle("📪 Modmail Closed")
        .setDescription(`Modmail closed by ${interaction.user}`)
        .setColor("Red")
        .setTimestamp();

      await interaction.channel.send({ embeds: [closeEmbed] });

      try {
        const user = await this.client.users.fetch(modmailEntry.author);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("📪 Modmail Closed")
            .setDescription(
              `Your modmail has been closed by ${interaction.user.tag}`
            )
            .setColor("Red")
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        }
      } catch (error) {
        logger.error("Could not DM user:", error);
      }

      await modmail.save();

      const thread = interaction.channel;
      if (thread) {
        await thread.setArchived(true);
      }

      await cache.delete(`modmail:${modmailEntry.author}`);

      return interaction.editReply({
        content: "Modmail closed successfully.",
      });
    } catch (error) {
      logger.error(error);
      return interaction.editReply({
        content: "There was an error closing the modmail.",
      });
    }
  }

  async respond(interaction) {
    try {
      const threadId = interaction.channel.id;
      const response = interaction.options.getString("message");

      let modmail = await ModmailSchema.findOne({
        guildId: interaction.guild.id,
        "modmails.threadId": threadId,
      });

      if (!modmail) {
        return interaction.reply({
          content: "This channel is not a modmail thread.",
          ephemeral: true,
        });
      }

      const modmailEntry = modmail.modmails.find(
        (m) => m.threadId === threadId
      );

      if (!modmailEntry || modmailEntry.status === "closed") {
        return interaction.reply({
          content: "This modmail is closed or invalid.",
          ephemeral: true,
        });
      }

      const threadEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.username} (Staff)`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(response)
        .setColor("#57F287")
        .setTimestamp();

      const dmEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.username} (Staff)`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(response)
        .setColor("#57F287")
        .setTimestamp();

      await interaction.channel.send({
        embeds: [threadEmbed],
      });

      const user = await this.client.users.fetch(modmailEntry.author);
      if (user) {
        try {
          await user.send({
            embeds: [dmEmbed],
          });
        } catch (error) {
          logger.error("Could not DM user:", error);
        }
      }

      modmailEntry.messages.push({
        id: interaction.id,
        content: response,
        author: interaction.user.id,
        createdAt: new Date(),
      });

      await modmail.save();

      return interaction.reply({
        content: "Response sent successfully to both thread and user's DM.",
        ephemeral: true,
      });
    } catch (error) {
      logger.error(error);
      return interaction.reply({
        content: "There was an error sending your response.",
        ephemeral: true,
      });
    }
  }

  async resolve(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const threadId = interaction.channel.id;
      const resolution = interaction.options.getString("resolution");

      let modmail = await ModmailSchema.findOne({
        guildId: interaction.guild.id,
        "modmails.threadId": threadId,
      });

      if (!modmail) {
        return interaction.editReply({
          content: "This channel is not a modmail thread.",
        });
      }

      const modmailEntry = modmail.modmails.find(
        (m) => m.threadId === threadId
      );

      if (!modmailEntry || modmailEntry.status === "closed") {
        return interaction.editReply({
          content: "This modmail is closed or invalid.",
        });
      }

      modmailEntry.status = "closed";
      modmailEntry.closedAt = new Date();

      const channel = await interaction.guild.channels.cache.get(
        modmailEntry.channelId
      );
      if (channel) {
        const message = await channel.messages.fetch(modmailEntry.id);
        if (message) {
          const updatedEmbed = EmbedBuilder.from(message.embeds[0])
            .setColor("Green")
            .spliceFields(2, 1, {
              name: "Status",
              value: "✅ Resolved",
              inline: true,
            });

          await message.edit({ embeds: [updatedEmbed] });
        }
      }

      const resolutionEmbed = new EmbedBuilder()
        .setTitle("✅ Modmail Resolved")
        .setDescription(resolution)
        .setColor("Green")
        .addFields([
          {
            name: "Resolved By",
            value: `${interaction.user}`,
            inline: true,
          },
          {
            name: "Resolution Time",
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true,
          },
        ])
        .setFooter({
          text: `Modmail ID: ${threadId}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      await interaction.channel.send({
        embeds: [resolutionEmbed],
      });

      try {
        const user = await this.client.users.fetch(modmailEntry.author);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("✅ Modmail Resolved")
            .setDescription(
              `Your modmail has been resolved by ${interaction.user.tag}`
            )
            .setColor("Green")
            .addFields([
              {
                name: "Resolution Message",
                value: resolution,
                inline: false,
              },
            ])
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        }
      } catch (error) {
        logger.error("Could not DM user:", error);
      }

      modmailEntry.messages.push({
        id: interaction.id,
        content: resolution,
        author: interaction.user.id,
        createdAt: new Date(),
      });

      await modmail.save();

      const thread = await interaction.guild.channels.cache.get(threadId);
      if (thread) {
        await thread.setArchived(true);
      }

      await cache.delete(`modmail:${modmailEntry.author}`);

      return interaction.editReply({
        content: "Modmail resolved and closed successfully.",
      });
    } catch (error) {
      logger.error(error);
      return interaction.editReply({
        content: "There was an error resolving the modmail.",
      });
    }
  }

  async getModmail(user) {
    const modmail = await ModmailSchema.findOne({
      guildId: interaction.guild.id,
      "modmails.author": user.id,
    });

    if (!modmail) {
      return interaction.reply({
        content: "No modmail found for this user.",
        ephemeral: true,
      });
    }

    const userModmails = modmail.modmails.filter((m) => m.author === user.id);

    if (!userModmails.length) {
      return interaction.reply({
        content: "No modmails found for this user.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📬 Modmails for ${user.username}`)
      .setColor(config.bot.color)
      .setTimestamp();

    userModmails.forEach((mail) => {
      embed.addFields({
        name: `Modmail ID: ${mail.threadId}`,
        value: `Status: ${mail.status === "open" ? "🟢 Open" : "🔴 Closed"}
                Created: <t:${Math.floor(mail.createdAt.getTime() / 1000)}:R>
                Messages: ${mail.messages.length}
                ${
                  mail.closedAt
                    ? `Closed: <t:${Math.floor(
                        mail.closedAt.getTime() / 1000
                      )}:R>`
                    : ""
                }`,
        inline: false,
      });
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  async handleDMResponse(message) {
    try {
      const cacheKey = `modmail:${message.author.id}`;
      let activeModmail = await cache.get(cacheKey);

      if (!activeModmail) {
        const modmail = await ModmailSchema.findOne({
          "modmails.author": message.author.id,
        });

        if (!modmail) return;

        activeModmail = modmail.modmails.find(
          (m) => m.author === message.author.id && m.status === "open"
        );

        if (!activeModmail) return;

        await cache.set(cacheKey, activeModmail, this.CACHE_TTL);
      }

      const threadEmbed = new EmbedBuilder()
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(message.content)
        .setColor("Blue")
        .setTimestamp();

      let channel = this.client.channels.cache.get(activeModmail.channelId);
      if (!channel) {
        channel = await this.client.channels.fetch(activeModmail.channelId);
      }

      if (!channel) {
        return message.reply("Error: Could not find the modmail channel.");
      }

      let thread = channel.threads.cache.get(activeModmail.threadId);
      if (!thread) {
        thread = await channel.threads.fetch(activeModmail.threadId);
      }

      if (!thread) {
        return message.reply("Error: Could not find your modmail thread.");
      }

      await thread.send({
        embeds: [threadEmbed],
      });

      ModmailSchema.findOneAndUpdate(
        {
          "modmails.threadId": activeModmail.threadId,
        },
        {
          $push: {
            "modmails.$.messages": {
              id: message.id,
              content: message.content,
              author: message.author.id,
              createdAt: new Date(),
            },
          },
        }
      ).exec();

      await message.react("✅");
    } catch (error) {
      logger.error("Error in handleDMResponse:", error);
      message.reply(
        "There was an error forwarding your message to the staff team."
      );
    }
  }
}

module.exports = Modmail;
