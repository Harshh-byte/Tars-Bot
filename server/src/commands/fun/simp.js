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
    return {
      category: "Financial Slave",
      emoji: "<:money:1478399282154573836>",
    };
  if (percentage >= 60)
    return {
      category: "Feet-Pic Donor",
      emoji: "<a:pepe_simp:1546229473589072062>",
    };
  if (percentage >= 35)
    return { category: "Down Bad & Desperate", emoji: "🥵" };
  if (percentage >= 15)
    return { category: "Licking the Floor Boots", emoji: "👅" };
  return { category: "Cold-Hearted", emoji: "🗿" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0%. I wouldn't even send you a 'k' if you were burning alive in front of me.",
        "0% simp. Meanwhile, you write 5-paragraph essays to Twitch streamers who don't even know you exist.",
        "I dropped into a literal black hole just to get away from desperate, needy incels like you.",
        "Simp level 0%. Meanwhile, you pay $100 a month on OnlyFans just for a pre-recorded voice note.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: ${randomRoast}`)
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
