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
    return { category: "Anaconda", emoji: "<:lipbite:1543158624572932156>" };
  if (inches >= 8) return { category: "Throat Destroyer", emoji: "🍌" };
  if (inches >= 4) return { category: "Decent Meat", emoji: "🍆" };
  if (inches > 0)
    return {
      category: "Limp Micro-Needle",
      emoji: "<:nopepe:1543158686870937661>",
    };
  return { category: "Inverted Clit", emoji: "🔍" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "32 inches. Big enough to break your mom in half and leave your sister traumatized.",
        "Mine is massive and rock hard; yours is a limp micro-clit that needs a microscope to find.",
        "Longer than your dad's search history and thick enough to tear your throat out.",
        "Bigger than your dad's expectations and deep enough to choke your mom to death.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 🍆 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const inches = Math.floor(Math.random() * 14);
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
