import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["howlesbian"];

export const data = {
  name: "lesbian",
  description: "Calculate how lesbian a user is.",
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

function getLesbianCategory(percentage) {
  if (percentage >= 85) {
    return {
      category: "👭 Ultimate Sapphic Icon",
      sarcasm: "Unmatched sapphic power. Cottagecore aesthetics unlocked.",
    };
  } else if (percentage >= 60) {
    return {
      category: "🌸 High Spectrum",
      sarcasm: "Subtle flannel shirts and iced coffee energy detected.",
    };
  } else if (percentage >= 35) {
    return {
      category: "⚖️ Moderately Fruity",
      sarcasm: "Curious thoughts and aesthetic appreciation.",
    };
  } else if (percentage >= 15) {
    return {
      category: "🌱 Low Spectrum",
      sarcasm: "Just admiring the art, nothing to see here.",
    };
  } else {
    return {
      category: "🗿 Zero Signal",
      sarcasm: "Not even a trace of sapphic frequency detected.",
    };
  }
}

export async function execute(interaction) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const percentage = Math.floor(Math.random() * 101);
    const { category, sarcasm } = getLesbianCategory(percentage);

    const userMention = `<@${targetUser.id}>`;
    const textPrefix = isSelf ? "Your" : `${targetUser.username}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention}: 👩‍❤️‍👩 ${textPrefix} lesbian percentage is **${percentage}%**\n\n` +
        `**Classification:** ${category}\n` +
        `*Tars: ${sarcasm}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Lesbian command handler:", err);
    Sentry.captureException(err);
  }
}
