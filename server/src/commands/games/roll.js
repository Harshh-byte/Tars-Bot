import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

const DICE_EMOJIS = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

const FALLBACK_ROLL_REMARKS = {
  6: "A natural 6. Statistically rare, don't get used to it.",
  1: "You rolled a 1. Peak bad luck achieved.",
  mid: "The laws of probability remain intact.",
};

export const aliases = ["dice"];

export const data = {
  name: "roll",
  description: "Roll a dice.",
  dm_permission: false,
};

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    const roll = Math.floor(Math.random() * 6) + 1;
    const emoji = DICE_EMOJIS[roll] || "🎲";
    let aiCommentary = roll === 6 ? FALLBACK_ROLL_REMARKS[6] : roll === 1 ? FALLBACK_ROLL_REMARKS[1] : FALLBACK_ROLL_REMARKS.mid;

    if (typeof buildAiReply === "function") {
      try {
        const res = await buildAiReply({
          authorId: interaction.user.id,
          inputText: `Give a witty 1-sentence sarcastic remark about rolling a 6-sided dice and getting ${roll}.`,
          mode: "normal",
          guild: interaction.guild,
        });
        if (res?.text) aiCommentary = res.text.trim();
      } catch (e) {
        logger.warn(`Failed to generate AI commentary for roll: ${e.message}`);
      }
    }

    const userMention = `<@${interaction.user.id}>`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention} rolled a dice...\n\n` +
        `🎲 Result: **${emoji} ${roll}**\n\n` +
        `*Tars: ${aiCommentary}*`
      )
      .setColor(Math.floor(Math.random() * 16777215));

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Dice Roll command execution:", err);
    Sentry.captureException(err);
  }
}
