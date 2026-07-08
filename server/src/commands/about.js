import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const data = {
  name: "about",
  description: "View information about the bot.",
  dm_permission: false,
};

export async function execute(interaction, client, BOT_INFO) {
  const botAvatar = client.user.displayAvatarURL();

  const embed = new EmbedBuilder()
    .setColor(BOT_INFO.color)
    .setAuthor({ name: `${BOT_INFO.authorText}`, iconURL: botAvatar })
    .setDescription(
      `Hey, I'm **Tars**!\n*A sarcasm-packed AI companion ready to roast or wish on demand.*`,
    )
    .setThumbnail(botAvatar)
    .setFooter({ text: `v/${BOT_INFO.version} · built with discord.js` });

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

  return interaction.reply({ embeds: [embed], components: [row] });
}
