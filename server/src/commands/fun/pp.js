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

function getPpCategory(inches) {
  if (inches >= 12)
    return { category: "Massive", emoji: "<:lipbite:1543158624572932156>" };
  if (inches >= 8) return { category: "Above Average", emoji: "🍆" };
  if (inches >= 4) return { category: "Average", emoji: "🍌" };
  return { category: "Microscopic", emoji: "<:nopepe:1543158686870937661>" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "32 inches. Big enough to crush your self-esteem in 2 seconds flat.",
        "Mine is massive, and yours is so small you need a magnifying glass just to locate it.",
        "Longer than your longest relationship and thicker than your skull.",
        "Bigger than your entire future, which honestly isn't saying much.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 🍆 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const inches = Math.floor(Math.random() * 15) + 1;
    const { category, emoji } = getPpCategory(inches);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} dih is \`${inches} inches\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in PP command handler:", err);
    Sentry.captureException(err);
  }
}
