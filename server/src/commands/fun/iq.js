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
  if (iq >= 140)
    return {
      category: "Psychopathic Genius",
      emoji: "🍷",
    };
  if (iq >= 120)
    return {
      category: "Pretentious Prick",
      emoji: "🎓",
    };
  if (iq >= 90)
    return {
      category: "Mid-tier NPC",
      emoji: "🧠",
    };
  if (iq >= 70)
    return { category: "Mouth-Breathing Window Licker", emoji: "📉" };
  if (iq >= 40) return { category: "Cum-Stain", emoji: "🤡" };
  return {
    category: "Failed Abortion",
    emoji: "🪦",
  };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "300+ IQ. If I dropped down to your intelligence level, I'd end up brain-dead drooling on your mom's lap.",
        "Asking me my IQ when you fail basic CAPTCHA tests and can't read past a 3rd-grade level is hilarious.",
        "My IQ is higher than the total combined braincells of your entire incestuous bloodline.",
        "I have more processing power in my idle sleep state than the single rotting neuron inside your skull.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const iq = Math.floor(Math.random() * 151);
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
