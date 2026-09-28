import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { infoEmbed, EMBED_COLORS } from "../../utils/embeds.js";
import logger from "../../utils/logger.js";

export const aliases = ["info"];

export const data = {
  name: "about",
  description: "View information about the bot.",
  dm_permission: false,
};

export async function execute(interaction, client, context = {}) {
  const BOT_INFO = context?.BOT_INFO || {
    authorText: "TARS",
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

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=277025778752&integration_type=0&scope=bot+applications.commands`;

  const headerSection = {
    type: 9,
    components: [
      {
        type: 10,
        content:
          `## About TARS\n` +
          `-# ᴘʟᴇɴᴛʏ ᴏꜰ ʜᴜᴍᴀɴꜱ ᴏᴜᴛ ᴛʜᴇʀᴇ, ʙᴜᴛ ᴅᴏᴡɴ ʜᴇʀᴇ ɪᴛ'ꜱ ᴊᴜꜱᴛ ᴜꜱ.\n\n` +
          `Hey, I'm **TARS**!\n` +
          `*A sarcasm-packed AI companion ready to chat, entertain, and assist on demand.*`,
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
      `<a:TapTap:1526235921643737219> **Bot Diagnostics**\n` +
      `• **Active Servers:** \`${serverCount}\`\n` +
      `• **Users Monitored:** \`${totalMembers.toLocaleString()}\`\n` +
      `• **Uptime:** \`${uptimeString}\`\n` +
      `• **Memory Policy:** \`2-Month Auto Cleanup\``,
  };

  const buttonRow = {
    type: 1,
    components: [
      {
        type: 2,
        style: 5,
        label: "Invite TARS",
        url: inviteUrl,
      },
      {
        type: 2,
        style: 5,
        label: "Developer",
        emoji: { id: "1526228198621184000", name: "dev" },
        url: `https://discord.com/users/${process.env.OWNER_ID}`,
      },
    ],
  };

  const footerSection = {
    type: 10,
    content: `-# v${BOT_INFO.version} • Built with ${BOT_INFO.framework || "discord.js"}`,
  };

  const v2Payload = {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.WHITE || 0xe0e0e0,
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

  try {
    return await interaction.reply(v2Payload);
  } catch (v2Error) {
    logger.warn(
      "V2 Components payload failed in about command, falling back to V1 embed:",
      v2Error,
    );
    const fallbackEmbed = infoEmbed({
      author: {
        name: BOT_INFO.authorText,
        iconURL: botAvatar,
      },
      description:
        "ᴘʟᴇɴᴛʏ ᴏꜰ ʜᴜᴍᴀɴꜱ ᴏᴜᴛ ᴛʜᴇʀᴇ, ʙᴜᴛ ᴅᴏᴡɴ ʜᴇʀᴇ ɪᴛ'ꜱ ᴊᴜꜱᴛ ᴜꜱ.\n\n" +
        "Hey, I'm **TARS**!\n" +
        "*A sarcasm-packed Discord companion ready to chat, entertain, and assist on demand.*",
      thumbnail: botAvatar,
      footer: `v${BOT_INFO.version} • Built with discord.js`,
      fields: [
        {
          name: "<a:TapTap:1526235921643737219> Bot Diagnostics",
          value:
            `• **Active Servers:** \`${serverCount}\`\n` +
            `• **Users Monitored:** \`${totalMembers.toLocaleString()}\`\n` +
            `• **Uptime:** \`${uptimeString}\`\n` +
            `• **Memory Policy:** \`2-Month Auto Cleanup\``,
        },
      ],
    });

    const legacyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite TARS")
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl),
      new ButtonBuilder()
        .setLabel("Developer")
        .setEmoji("1526228198621184000")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/users/${process.env.OWNER_ID}`),
    );

    return await interaction.reply({
      embeds: [fallbackEmbed],
      components: [legacyRow],
    });
  }
}
