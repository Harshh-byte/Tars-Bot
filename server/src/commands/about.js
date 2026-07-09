import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const data = {
  name: "about",
  description:
    "View detailed statistics and configuration parameters for Tars.",
  dm_permission: false,
};

export async function execute(interaction, client, BOT_INFO) {
  const botAvatar = client.user.displayAvatarURL();
  const ping = client.ws.ping;

  const randomColor = Math.floor(Math.random() * 16777215);

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
    (acc, guild) => acc + guild.memberCount,
    0,
  );

  const embed = new EmbedBuilder()
    .setColor(randomColor)
    .setAuthor({
      name: `${BOT_INFO.authorText} Core Intelligence Unit`,
      iconURL: botAvatar,
    })
    .setDescription(
      `*“Plenty of human security out there, but down here it’s just us.”*\n\nI am **Tars**, a sarcasm-driven companion unit built on a modular, event-routed architecture.`,
    )
    .setThumbnail(botAvatar)
    .addFields(
      {
        name: "🤖 System Metrics",
        value: `• **Uptime:** \`${uptimeString}\`\n• **Gateway Ping:** \`${ping}ms\`\n• **Active Servers:** \`${serverCount}\`\n• **Users Monitored:** \`${totalMembers.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "⚙️ TARS Parameter Settings",
        value: `• **Honesty:** \`${BOT_INFO.settings.honesty}\`\n• **Humor:** \`${BOT_INFO.settings.humor}\`\n• **Discretion:** \`${BOT_INFO.settings.discretion}\``,
        inline: true,
      },
      {
        name: "🛠️ Architecture Footprint",
        value: `• **Version:** \`v${BOT_INFO.version}\`\n• **Framework:** \`${BOT_INFO.framework}\`\n• **AI Model:** \`gemini-2.5-flash-lite\`\n• **Data Expiration Policy:** \`6-Month Expiry (Auto-Cleanup Routine)\``,
        inline: false,
      },
    )
    .setFooter({
      text: `Unit Maintained by ${BOT_INFO.developerText} · Sync Status: Operational`,
    });

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=2415938560&integration_type=0&scope=bot+applications.commands`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Invite Tars")
      .setURL(inviteUrl)
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel("Developer Profile")
      .setURL("https://discord.com/users/569766329960103941")
      .setStyle(ButtonStyle.Link),
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}
