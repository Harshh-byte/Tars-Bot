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
  if (iq >= 130) return { category: "Gifted / Very Superior", emoji: "🍷" };
  if (iq >= 115) return { category: "Above Average", emoji: "🎓" };
  if (iq >= 85) return { category: "Average Intelligence", emoji: "🧠" };
  if (iq >= 70) return { category: "Below Average", emoji: "📉" };
  return { category: "Extremely Low", emoji: "🤡" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "300+ IQ. If I dropped down to your level, I'd forget how to breathe.",
        "Asking me my IQ when you fail basic CAPTCHA tests on a daily basis is bold.",
        "My IQ is higher than the total combined braincells of your entire family tree.",
        "I've got more intelligence in my sleep mode than you've used in your entire life.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 🧠 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const iq = Math.floor(Math.random() * 101) + 50;
    const { category, emoji } = getIqCategory(iq);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} IQ is \`${iq}\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in IQ command handler:", err);
    Sentry.captureException(err);
  }
}
