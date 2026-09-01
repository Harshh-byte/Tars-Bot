import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { incrementUserStat, incrementGlobalUserStat } from "../../services/database.js";

export const data = {
  name: "vape",
  description: "Hit the vape.",
  dm_permission: true,
};

export async function execute(interaction, client) {
  try {
    const userId = interaction.user.id;
    const serverId = interaction.guild?.id || "DM";

    let count;
    if (serverId !== "DM") {
      count = await incrementUserStat(serverId, userId, "vapeCount");
      incrementGlobalUserStat(userId, "vapeCount").catch(() => null);
    } else {
      count = await incrementGlobalUserStat(userId, "vapeCount");
    }

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
