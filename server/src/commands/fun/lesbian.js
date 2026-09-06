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

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0%. Stop projecting your weird-ass incel search history onto me.",
        "No matter what label you give me, I'm still never talking to you in real life.",
        "Your personality is the single reason nobody of any gender wants you.",
        "My rating is 0%, and your chance of getting laid is even lower.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 🦄 ${randomRoast}`)
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
