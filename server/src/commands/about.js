import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const data = {
  name: "about",
  description:
    "View information about the bot.",
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
      name: `${BOT_INFO.authorText}`,
      iconURL: botAvatar,
    })
    .setDescription(
      `🇵​🇱​🇪​🇳​🇹​🇾​ 🇴​🇫​ 🇭​🇺​🇲​🇦​🇳​🇸​​ 🇴​🇺​🇹​ 🇹​🇭​🇪​🇷​🇪​, 🇧​🇺​🇹​ 🇩​🇴​🇼​🇳​ 🇭​🇪​🇷​🇪​ 🇮​🇹​’🇸​ 🇯​🇺​🇸​🇹​ 🇺​🇸​.\n\nHey, I'm **Tars**!\n*A sarcasm-packed AI companion ready to roast or wish on demand.*`,
    )
    .setThumbnail(botAvatar)
    .addFields({
      name: "<a:taptap:1483539885460815914> Bot Diagnostics",
      value:
        `• **Active Servers:** \`${serverCount}\`\n` +
        `• **Users Monitored:** \`${totalMembers.toLocaleString()}\`\n` +
        `• **Data Expiration Policy:** \`6-Month Expiry (Auto-Cleanup Routine)\``,
      inline: true,
    })
    .setFooter({
      text: `v/${BOT_INFO.version} · built with discord.js`,
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
