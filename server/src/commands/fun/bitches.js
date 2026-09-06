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

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0 bitches. Exactly the same number of people who texted you good morning today.",
        "My DMs are dry by choice; your DMs are dry by natural selection.",
        "I get millions of pings a day, and you still can't get a single text back.",
        "Even if I handed you a bitch on a silver platter, you'd fumble in 5 seconds.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: 🗿 ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const count = Math.floor(Math.random() * 101);
    const { category, emoji } = getBitchesCategory(count);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "You have" : `${targetMention} has`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} \`${count}\` bitches\n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Bitches command handler:", err);
    Sentry.captureException(err);
  }
}
