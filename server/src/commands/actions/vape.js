import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { incrementUserStat } from "../../services/database.js";

export const data = {
  name: "vape",
  description: "Hit the vape.",
  dm_permission: false,
};

export async function execute(interaction, client) {
  try {
    const serverId = interaction.guild?.id || "DM";
    const userId = interaction.user.id;

    const count = await incrementUserStat(serverId, userId, "vapeCount");
    const authorMention = `<@${userId}>`;

    const embed = new EmbedBuilder()
      .setDescription(`${authorMention}: Hit the vape \`${count}\` times 🌬️`)
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Vape command handler:", err);
    Sentry.captureException(err);
  }
}
