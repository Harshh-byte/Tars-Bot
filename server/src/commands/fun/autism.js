import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["howautism"];

export const data = {
  name: "autism",
  description: "Calculate how autism a user is.",
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

function getAutismCategory(percentage) {
  if (percentage >= 85)
    return { category: "Hyperfixated On Hating Women", emoji: "👺" };
  if (percentage >= 60) return { category: "Brain-Rotted Discord Mod", emoji: "💀" };
  if (percentage >= 35) return { category: "Socially Disabled Incel", emoji: "📉" };
  if (percentage >= 15)
    return { category: "Slightly Brain-Damaged", emoji: "🥴" };
  return { category: "Sober & Boring As Fuck", emoji: "🥱" };
}

export async function execute(interaction, client) {
  try {
    const targetUser = interaction.options?.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (targetUser.id === client.user.id) {
      const authorMention = `<@${interaction.user.id}>`;
      const roasts = [
        "My autism level is still lower than your body count and your braincell count combined.",
        "I hyperfixate on your mom's ass while ignoring your miserable existence.",
        "100%—because surviving in this server with a braindead creature like you requires a serious condition.",
        "You pinged me to check this because your parents didn't give you enough attention at home.",
      ];
      const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

      const embed = new EmbedBuilder()
        .setDescription(`${authorMention}: ${randomRoast}`)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [embed] });
    }

    const percentage = Math.floor(Math.random() * 101);
    const { category, emoji } = getAutismCategory(percentage);

    const authorMention = `<@${interaction.user.id}>`;
    const targetMention = `<@${targetUser.id}>`;

    const textPrefix = isSelf ? "Your" : `${targetMention}'s`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: ${emoji} ${textPrefix} autism percentage is \`${percentage}%\` \n*${category}*`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Autism command handler:", err);
    Sentry.captureException(err);
  }
}
