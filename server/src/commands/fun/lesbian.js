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
  if (percentage >= 85) return { category: "Sapphic Final Boss", emoji: "✂️" };
  if (percentage >= 60)
    return { category: "That's Not Very Straight", emoji: "🚨" };
  if (percentage >= 35) return { category: "Certified Fruity", emoji: "🦄" };
  if (percentage >= 15) return { category: "Hmm...Interesting", emoji: "👀" };
  return { category: "Allegations: Unfounded", emoji: "🗿" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const percentage = Math.floor(Math.random() * 101);
    const { category, emoji } = getLesbianCategory(percentage);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} lesbian percentage is \`${percentage}%\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Lesbian command handler:", err);
    Sentry.captureException(err);
  }
}
