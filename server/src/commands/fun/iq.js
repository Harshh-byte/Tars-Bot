import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const data = {
  name: "iq",
  description: "Calculate a user's IQ.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to calculate IQ for.",
      type: 6,
      required: false,
    },
  ],
};

function getIqCategory(iq) {
  if (iq >= 130) 
    return { category: "Gifted / Very Superior", emoji: "🍷" };
  if (iq >= 115) 
    return { category: "Above Average", emoji: "🎓" };
  if (iq >= 85) 
    return { category: "Average Intelligence", emoji: "🧠" };
  if (iq >= 70) 
    return { category: "Below Average", emoji: "📉" };
  return { category: "Extremely Low", emoji: "🤡" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const iq = Math.floor(Math.random() * 101) + 50;
    const { category, emoji } = getIqCategory(iq);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} IQ is \`${iq}\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in IQ command handler:", err);
    Sentry.captureException(err);
  }
}
