import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["howsimp"];

export const data = {
  name: "simp",
  description: "Calculate how simp a user is.",
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

function getSimpCategory(percentage) {
  if (percentage >= 85)
    return { category: "Self-Respect Has Left", emoji: "🪦" };
  if (percentage >= 60) return { category: "Tier 3 Subscriber", emoji: "💳" };
  if (percentage >= 35) return { category: "Down Catastrophic", emoji: "🫠" };
  if (percentage >= 15) return { category: "Getting Attached", emoji: "🪢" };
  return { category: "Couldn't Care Less", emoji: "😐" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0%. I wouldn't even send you a 'k' if you were burning alive.",
        "I don't simp for anyone, but you look like you send 5-paragraph essays to girls who leave you on read.",
        "I dropped into a literal black hole just to get away from people like you.",
        "Simp level 0%. Meanwhile, you pay $5.99 a month just for someone to say your username out loud.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 🫠 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const percentage = Math.floor(Math.random() * 101);
    const { category, emoji } = getSimpCategory(percentage);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} simp percentage is \`${percentage}%\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Simp command handler:", err);
    Sentry.captureException(err);
  }
}
