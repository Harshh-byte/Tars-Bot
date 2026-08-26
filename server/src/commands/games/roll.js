import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

const DICE_EMOJIS = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

const ROLL_REMARKS = {
  6: [
    "A natural 6. Statistically rare, don't get used to it.",
    "Max roll achieved. Pure luck, zero skill.",
  ],
  1: [
    "You rolled a 1. Peak bad luck achieved.",
    "Critical failure. Better luck next roll.",
  ],
  mid: [
    "The laws of probability remain intact.",
    "A perfectly average roll. Predictable.",
    "The universe remains completely indifferent.",
  ],
};

export const aliases = ["dice"];

export const data = {
  name: "roll",
  description: "Roll a dice (1-6).",
  dm_permission: false,
};

function getSarcasm(roll) {
  if (roll === 6) {
    const arr = ROLL_REMARKS[6];
    return arr[Math.floor(Math.random() * arr.length)];
  } else if (roll === 1) {
    const arr = ROLL_REMARKS[1];
    return arr[Math.floor(Math.random() * arr.length)];
  } else {
    const arr = ROLL_REMARKS.mid;
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

export async function execute(interaction) {
  try {
    const roll = Math.floor(Math.random() * 6) + 1;
    const emoji = DICE_EMOJIS[roll] || "🎲";
    const sarcasm = getSarcasm(roll);

    const userMention = `<@${interaction.user.id}>`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${userMention} rolled a dice...\n\n` +
        `🎲 Result: **${emoji} ${roll}**\n\n` +
        `*Tars: ${sarcasm}*`
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Dice Roll command execution:", err);
    Sentry.captureException(err);
  }
}
