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
  if (percentage >= 85) return { category: "Scissor Queen", emoji: "✂️" };
  if (percentage >= 60)
    return { category: "Eats Pussy for Breakfast", emoji: "🚨" };
  if (percentage >= 35)
    return { category: "Finger Bang Enthusiast", emoji: "🦄" };
  if (percentage >= 15) return { category: "Curious", emoji: "👀" };
  return { category: "Straight", emoji: "🗿" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0%. Stop projecting your crusty-ass incel search history onto me.",
        "0% lesbian. Even if I were into women, your pathetic ass wouldn't get a single drop of play.",
        "My rating is 0%, and your chance of eating pussy in this lifetime is lower than your credit score.",
        "Checking my orientation when nobody of any gender, sexuality, or species would let you touch them.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

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
