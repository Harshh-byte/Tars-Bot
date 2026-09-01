import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["howautism"];

export const data = {
  name: "autism",
  description: "Calculate how autism a user is.",
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

function getAutismCategory(percentage) {
  if (percentage >= 85)
    return { category: "Hyperfixation Master", emoji: "🧩" };
  if (percentage >= 60)
    return { category: "Knows Way Too Much", emoji: "📚" };
  if (percentage >= 35)
    return { category: "Slightly Acoustic", emoji: "🎧" };
  if (percentage >= 15)
    return { category: "Suspiciously Specific", emoji: "🔎" };
  return { category: "NPC Settings: Default", emoji: "🤖" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const percentage = Math.floor(Math.random() * 101);
    const { category, emoji } = getAutismCategory(percentage);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} autism percentage is \`${percentage}%\` \n*${category}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Autism command handler:", err);
    Sentry.captureException(err);
  }
}
