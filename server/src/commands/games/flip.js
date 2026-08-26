import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

const HEADS_REMARKS = [
  "Gravity works. You landed on Heads.",
  "Heads. Don't let it get to yours.",
  "Coin says Heads. 50% chance, 100% predictable.",
];

const TAILS_REMARKS = [
  "Tails. Physics never lies.",
  "Landed on Tails. Better luck next flip.",
  "Tails wins this round.",
];

export const aliases = ["coin", "cf"];

export const data = {
  name: "flip",
  description: "Flip a coin (Heads or Tails).",
  dm_permission: false,
};

export async function execute(interaction) {
  try {
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? "HEADS" : "TAILS";
    const remarks = isHeads ? HEADS_REMARKS : TAILS_REMARKS;
    const sarcasm = remarks[Math.floor(Math.random() * remarks.length)];

    const userMention = `<@${interaction.user.id}>`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention} flipped a coin...\n\n` +
        `🪙 Result: **${result}**\n\n` +
        `*Tars: ${sarcasm}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Coin Flip command execution:", err);
    Sentry.captureException(err);
  }
}
