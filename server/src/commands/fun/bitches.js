import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { EMOJIS } from "../../utils/emojis.js";

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
  if (count >= 85) return { category: "Pussy Magnet", emoji: "🗿" };
  if (count >= 60) return { category: "Certified Rizz God", emoji: "🥶" };
  if (count >= 35)
    return {
      category: "Getting Your Dick Wet",
      emoji: EMOJIS.lipbite,
    };
  if (count >= 15)
    return { category: "Scraping Bottom of the Barrel", emoji: "🚮" };
  if (count > 0) return { category: "Desperate Crumb-Snatcher", emoji: "🤏" };
  return {
    category: "Chronically Maidenless",
    emoji: "🥺",
  };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "0 bitches. The only action you've seen in months is when your hand cramped up in the shower.",
        "0 bitches. You look like you pay for premium Tinder just to get swiped left on faster.",
        "I get millions of pings a day while you pay $50 a month on OnlyFans just to hear a girl say your name.",
        "Even if a bitch threw herself at you naked, you'd find a way to fumble and cry about it on Discord.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: ${randomRoast}`)
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
