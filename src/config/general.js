const config = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  bot: {
    color: "White",
    footer: {
      text: "membercat.exe",
    },
    timestamp: true,
  },
  logging: {
    channel: "1288652816830959617",
  },
  membercat: {
    updater: {
      channel: "1288652816830959617",
      interval: 1000 * 60 * 3, // 3 minutes
      pingRole: "1259301624266887230",
    },
  },
};

module.exports = config;
