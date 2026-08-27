import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

const FALLBACK_HEADS_REMARKS = [
  "Gravity works. You landed on Heads.",
  "Heads. Don't let it get to yours.",
  "Coin says Heads. 50% chance, 100% predictable.",
];

const FALLBACK_TAILS_REMARKS = [
  "Tails. Physics never lies.",
  "Landed on Tails. Better luck next flip.",
  "Tails wins this round.",
];

export const aliases = ["coin", "cf"];

export const data = {
  name: "flip",
  description: "Flip a coin.",
  dm_permission: false,
};

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? "HEADS" : "TAILS";
    const fallbacks = isHeads ? FALLBACK_HEADS_REMARKS : FALLBACK_TAILS_REMARKS;
    let aiCommentary = fallbacks[Math.floor(Math.random() * fallbacks.length)];

    if (typeof buildAiReply === "function") {
      try {
        const res = await buildAiReply({
          authorId: interaction.user.id,
          inputText: `Give a witty 1-sentence sarcastic remark about flipping a coin and landing on ${result}.`,
          mode: "normal",
          guild: interaction.guild,
        });
        if (res?.text) aiCommentary = res.text.trim();
      } catch (e) {
        logger.warn(`Failed to generate AI commentary for flip: ${e.message}`);
      }
    }

    const userMention = `<@${interaction.user.id}>`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention} flipped a coin...\n\n` +
        `🪙 Result: **${result}**\n\n` +
        `*Tars: ${aiCommentary}*`
      )
      .setColor(Math.floor(Math.random() * 16777215));

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Coin Flip command execution:", err);
    Sentry.captureException(err);
  }
}
