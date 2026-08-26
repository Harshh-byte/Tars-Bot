import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["dih"];

export const data = {
  name: "pp",
  description: "Check a user's pp size.",
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

function getPpSarcasm(inches) {
  if (inches >= 12) {
    return "Did you use a cheat code or are you storing a secondary weapon?";
  } else if (inches >= 8) {
    return "Respectable statistics. Don't flex too hard.";
  } else if (inches >= 4) {
    return "Aggressively average. Perfectly fine, nothing to write home about.";
  } else {
    return "Requires NASA satellite imagery and a magnifying glass to confirm existence.";
  }
}

export async function execute(interaction) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const inches = Math.floor(Math.random() * 15) + 1;
    const sarcasm = getPpSarcasm(inches);

    const userMention = `<@${targetUser.id}>`;
    const textPrefix = isSelf ? "Your" : `${targetUser.username}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention}: 📏 ${textPrefix} dih size is **${inches} inches**\n\n` +
        `*Tars: ${sarcasm}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in PP command handler:", err);
    Sentry.captureException(err);
  }
}
