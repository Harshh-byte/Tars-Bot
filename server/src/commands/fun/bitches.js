import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const data = {
  name: "bitches",
  description: "Calculate how many bitches a user has.",
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

function getBitchesCategory(count) {
  if (count >= 85) return { category: "Absolute Gigachad", emoji: "🗿" };
  if (count >= 60) return { category: "Rizz Master", emoji: "🥶" };
  if (count >= 35)
    return {
      category: "Pulling Constantly",
      emoji: "<:blushed:1543158784653004810>",
    };
  if (count >= 15) return { category: "Getting Somewhere", emoji: "😏" };
  if (count > 0) return { category: "Minimal Rizz", emoji: "🤏" };
  return { category: "No Bitches?", emoji: "🥺" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    const count = Math.floor(Math.random() * 101);
    const { category, emoji } = getBitchesCategory(count);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : targetMention;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} has \`${count}\` bitches\n*${category}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Bitches command handler:", err);
    Sentry.captureException(err);
  }
}
