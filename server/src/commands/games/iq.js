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
  if (iq >= 130) {
    return {
      category: "Gifted / Very Superior (Top 2%)",
      sarcasm: "Did you inspect element or is your brain actually functioning today?",
    };
  } else if (iq >= 115) {
    return {
      category: "Above Average",
      sarcasm: "Slightly above room temperature. Impressive for a human.",
    };
  } else if (iq >= 85) {
    return {
      category: "Average Intelligence",
      sarcasm: "Aggressively average. Pure NPC energy detected.",
    };
  } else if (iq >= 70) {
    return {
      category: "Below Average / Borderline",
      sarcasm: "Struggling with basic arithmetic and life decisions, aren't we?",
    };
  } else {
    return {
      category: "Extremely Low",
      sarcasm: "My sarcasm quotient was set higher than your entire score.",
    };
  }
}

export async function execute(interaction) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const iq = Math.floor(Math.random() * 101) + 50;
    const { category, sarcasm } = getIqCategory(iq);

    const userMention = `<@${targetUser.id}>`;
    const textPrefix = isSelf ? "Your" : `${targetUser.username}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention}: 🧠 Your IQ is **${iq}**\n\n` +
        `**Classification:** ${category}\n` +
        `*Tars: ${sarcasm}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in IQ command handler:", err);
    Sentry.captureException(err);
  }
}
