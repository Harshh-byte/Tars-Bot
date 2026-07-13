import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { infoEmbed } from "../utils/embeds.js";
export const data = {
  name: "about",
  description: "View information about the bot.",
  dm_permission: false,
};
export async function execute(interaction, client, BOT_INFO) {
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
  const embed = infoEmbed({
    author: {
      name: BOT_INFO.authorText,
      iconURL: botAvatar,
    },
    description:
      "🇵​🇱​🇪​🇳​🇹​🇾​ 🇴​🇫​ 🇭​🇺​🇲​🇦​🇳​🇸​ 🇴​🇺​🇹​ 🇹​🇭​🇪​🇷​🇪​, 🇧​🇺​🇹​ 🇩​🇴​🇼​🇳​ 🇭​🇪​🇷​🇪​ 🇮​🇹​’🇸​ 🇯​🇺​🇸​🇹​ 🇺​🇸​.\n\n" +
      "Hey, I'm **Tars**!\n" +
      "*A sarcasm-packed AI companion ready to roast or wish on demand.*",
    thumbnail: botAvatar,
    footer: `v${BOT_INFO.version} • Built with discord.js`,
    fields: [
      {
        name: "<a:taptap:1483539885460815914> Bot Diagnostics",
        value:
          `• **Active Servers:** \`${serverCount}\`\n` +
          `• **Users Monitored:** \`${totalMembers.toLocaleString()}\`\n` +
          `• **Memory Policy:** \`6-Month Auto Cleanup\``,
      },
    ],
  });
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=2415938560&integration_type=0&scope=bot+applications.commands`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Invite Tars")
      .setStyle(ButtonStyle.Link)
      .setURL(inviteUrl),
    new ButtonBuilder()
      .setLabel("Developer")
      .setStyle(ButtonStyle.Link)
      .setURL("https://discord.com/users/${process.env.OWNER_ID}"),
  );
  return interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}
