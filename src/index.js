require("dotenv").config();
require("module-alias/register");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
  Partials,
} = require("discord.js");
const logger = require("@logger");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const eventsDir = path.join(__dirname, "/events");
const commandsDir = path.join(__dirname, "/commands");
const eventFolders = fs.readdirSync(eventsDir);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

(async () => {
  logger.info("Connecting to Database...");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await client.login(process.env.TOKEN);
    logger.success(`Connected to Database`);
  } catch (error) {
    // kill process if database connection fails

    logger.error(error);
    logger.warn("Terminating node process to ensure data integrity...");
    process.exit(1);
  }
})();

// read command files
const readCommands = (dir) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      readCommands(filePath);
    } else if (file.startsWith("!")) {
      logger.warn(`Skipping "${file}" as it is marked as an exclusion.`);
    } else if (file.endsWith(".js")) {
      const command = require(filePath);

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        logger.success(`Registered command "${command.data.name}"`);
      } else {
        logger.warn(
          `Command "${file}" is missing a required "data" or "execute" property.`
        );
      }
    }
  }
};

client.commands = new Collection();
readCommands(commandsDir); // read commands

const commands = Array.from(client.commands.values()).map(
  (command) => command.data
);

logger.success(`Loaded ${commands.length} commands.`);

// event handler function
const eventHandler = (eventDir, eventName) => {
  const eventFiles = fs
    .readdirSync(eventDir)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    try {
      const handler = require(path.join(eventDir, file));

      client.on(eventName, async (...args) => {
        try {
          await handler(client, ...args);
        } catch (error) {
          logger.error(error);
        }
      });
    } catch (error) {
      logger.error(error);
    }
  }
};

// iterate through event folders
for (const folder of eventFolders) {
  const eventDir = path.join(eventsDir, folder);
  if (fs.lstatSync(eventDir).isDirectory()) {
    eventHandler(eventDir, folder);
  }
}

// slash command interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, client);
    logger.info(
      `${interaction.user.username} executed command /${interaction.commandName}`
    );
  } catch (error) {
    logger.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(
        "An internal error has occurred. Please try again later"
      );
    } else {
      await interaction.reply(
        "An internal error has occurred. Please try again later"
      );
    }
  }
});

// put commands to Discord API
client.once("ready", () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  rest
    .put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    })
    .then(() => {
      if (commands.length === 0) {
        logger.warn("No commands found. Skipping registration.");
      } else {
        logger.success(
          `Successfully registered ${commands.length} command(s).`
        );
      }
    })
    .catch((error) => {
      logger.error(error);
    });
});

client.on("error", (error) => {
  logger.error(error);
});

process.on("unhandledRejection", (error) => {
  logger.error(error);
});

process.on("uncaughtException", (error) => {
  logger.error(error);
});
