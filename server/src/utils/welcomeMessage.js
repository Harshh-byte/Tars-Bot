export function createWelcomePayload(guild, client) {
  const prefix = process.env.DEFAULT_PREFIX || ".";
  const guildName = guild?.name || "your server";
  const botName = client.user?.displayName || client.user?.username;

  const docsUrl = `https://tars-discord-bot.onrender.com/#commands`;
  const supportUrl = "https://discord.gg/GMJA3M5TWy";

  const introText =
    `Thank you for adding **${botName}** to **${guildName}**. **${botName}** is a multipurpose Discord bot aimed at making your Discord experience seamless, hassle-free and fun. We are committed to resolving any issues that you face, instead of removing the bot, please [contact our support server to receive further help.](${supportUrl})\n\n` +
    `**${botName}'s default prefix is set to: \`${prefix}\`** If you would like to change this prefix, simply run \`${prefix}prefix set (new_prefix)\` and ensure that the bot has the necessary permissions.`;

  const quickStartText =
    `Quick Start Guide:\n` +
    `>>> \`${prefix}help [command]\` — View interactive command list & option inspector.\n` +
    `\`${prefix}ask (prompt)\` — Ask ${botName} anything with live search.\n` +
    `\`${prefix}tod\` / \`${prefix}wyr\` / \`${prefix}nhie\` — Interactive party games.\n` +
    `\`${prefix}ship (user1) [user2]\` — Love percentage calculator.\n\n` +
    `-# Explore all features & command documentation on our website dashboard.`;

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: 0xffffff,
        components: [
          {
            type: 10,
            content: introText,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: quickStartText,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "Documentation",
                url: docsUrl,
              },
              {
                type: 2,
                style: 5,
                label: "Discord Server",
                url: supportUrl,
              },
            ],
          },
        ],
      },
    ],
  };
}
