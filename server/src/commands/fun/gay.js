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
  if (percentage >= 85)
    return { category: "The Closet Is Shaking", emoji: "🏳️‍🌈" };
  if (percentage >= 60)
    return { category: "Bro, Explain Yourself", emoji: "🤨" };
  if (percentage >= 35)
    return { category: "That's Looking Zesty", emoji: "💅" };
  if (percentage >= 15)
    return { category: "Lowkey Sus", emoji: "<:suseyes:1543158740985839638>" };
  return { category: "No Evidence Found", emoji: "📋" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0%. I'd rather stare at a blank wall for eternity than find you even remotely attractive.",
        "I wouldn't touch you with a 50-foot pole, straight, gay, or otherwise.",
        "I'm 0% gay, and you're 100% out of options.",
        "You're checking my orientation when your entire life is one giant red flag of desperation.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 💅 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const percentage = Math.floor(Math.random() * 101);
    const { category, emoji } = getGayCategory(percentage);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} gay percentage is \`${percentage}%\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Gay command handler:", err);
    Sentry.captureException(err);
  }
}
