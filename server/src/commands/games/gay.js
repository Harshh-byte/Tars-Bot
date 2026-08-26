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
  if (percentage >= 85) {
    return {
      category: "🌈 Rainbow Royalty",
      sarcasm: "100% pure rainbow essence. Flags bend in your presence.",
    };
  } else if (percentage >= 60) {
    return {
      category: "✨ High Spectrum",
      sarcasm: "Fabulous energy radiating at maximum frequency.",
    };
  } else if (percentage >= 35) {
    return {
      category: "⚖️ Perfectly Balanced",
      sarcasm: "Slightly fruity with a hint of dramatic flair.",
    };
  } else if (percentage >= 15) {
    return {
      category: "🌱 Mild Vibe",
      sarcasm: "Mostly straight, but you have your moments.",
    };
  } else {
    return {
      category: "🗿 Straight as a Line",
      sarcasm: "Straight as a ruler. But rulers can bend under pressure.",
    };
  }
}

export async function execute(interaction) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const percentage = Math.floor(Math.random() * 101);
    const { category, sarcasm } = getGayCategory(percentage);

    const userMention = `<@${targetUser.id}>`;
    const textPrefix = isSelf ? "Your" : `${targetUser.username}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention}: 🌈 ${textPrefix} gay percentage is **${percentage}%**\n\n` +
        `**Classification:** ${category}\n` +
        `*Tars: ${sarcasm}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Gay command handler:", err);
    Sentry.captureException(err);
  }
}
