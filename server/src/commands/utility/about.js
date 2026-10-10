import { EMBED_COLORS } from "../../utils/embeds.js";
import { EMOJIS, EMOJI_IDS } from "../../utils/emojis.js";

export const aliases = ["info"];

export const data = {
  name: "about",
  description: "View information about the bot.",
  dm_permission: false,
};

export async function execute(interaction, client) {
  const BOT_INFO = {
    version: "4.0",
    framework: "discord.js",
  };
  const botAvatar = client.user.displayAvatarURL({
    extension: "png",
    size: 512,
  });

  let totalSeconds = Math.floor(client.uptime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  const serverCount = client.guilds.cache.size;
  const totalMembers = client.guilds.cache.reduce(
    (total, guild) => total + guild.memberCount,
    0,
  );

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=277024730304&integration_type=0&scope=bot+applications.commands`;

  const headerSection = {
    type: 9,
    components: [
      {
        type: 10,
        content:
          `### ${EMOJIS.TapTap} Bot Infomation\n\n` +
          `Hey, I'm __**${client.user.displayName}**__!\n` +
          `*A sarcasm-packed Discord companion ready to chat, entertain, and assist on demand.*`,
      },
    ],
    accessory: {
      type: 11,
      media: {
        url: botAvatar,
      },
    },
  };

  const statsSection = {
    type: 10,
    content:
      `**Bot Diagnostics**\n` +
      `-# \`•\` **Active Servers:** \`${serverCount}\`\n` +
      `-# \`•\` **Users Monitored:** \`${totalMembers.toLocaleString()}\`\n` +
      `-# \`•\` **Memory Policy:** \`2-Month Auto Cleanup\``,
  };

  const buttonRow = {
    type: 1,
    components: [
      {
        type: 2,
        style: 5,
        label: "Invite Me",
        emoji: { id: EMOJI_IDS.Invite, name: "Invite" },
        url: inviteUrl,
      },
      {
        type: 2,
        style: 5,
        label: "Developer",
        emoji: { id: EMOJI_IDS.Developer, name: "Developer" },
        url: `https://discord.com/users/${process.env.OWNER_ID}`,
      },
    ],
  };

  const footerSection = {
    type: 10,
    content: `-# v${BOT_INFO.version} • Built with ${BOT_INFO.framework}`,
  };

  const payload = {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.WHITE,
        components: [
          headerSection,
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          statsSection,
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          buttonRow,
          footerSection,
        ],
      },
    ],
  };

  return await interaction.reply(payload);
}
