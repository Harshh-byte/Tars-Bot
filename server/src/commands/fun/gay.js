import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["howgay"];

export const data = {
  name: "gay",
  description: "Calculate how gay a user is.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to check.",
      type: 6,
      required: false,
    },
  ],
};

function getGayCategory(percentage) {
  if (percentage >= 85)
    return { category: "Full-Blown Cock Fiend", emoji: "🏳️‍🌈" };
  if (percentage >= 60)
    return { category: "Taking It Deep Daily", emoji: "🤨" };
  if (percentage >= 35)
    return { category: "Zesty & Down Bad", emoji: "💅" };
  if (percentage >= 15)
    return { category: "Lowkey Sus", emoji: "<:suseyes:1543158740985839638>" };
  return { category: "Straight as an Arrow", emoji: "📋" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0%. I wouldn't touch your miserable ass even if you were the last breathing creature on earth.",
        "0% gay. The only thing taking it up the ass here is your dignity every time you type.",
        "I'm 0% gay, but your dad is 100% getting his dick sucked behind a dumpster right now.",
        "Checking my gay meter while you sit there taking it raw from life every single day.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 💅 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const percentage = Math.floor(Math.random() * 101);
    const { category, emoji } = getGayCategory(percentage);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} gay percentage is \`${percentage}%\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Gay command handler:", err);
    Sentry.captureException(err);
  }
}
