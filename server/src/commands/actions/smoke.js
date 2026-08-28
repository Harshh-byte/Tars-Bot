import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { incrementGlobalUserStat } from "../../services/database.js";

export const aliases = ["cigar"];

export const data = {
  name: "smoke",
  description: "Take a hit of smoke.",
  dm_permission: true,
};

export async function execute(interaction, client) {
  try {
    const userId = interaction.user.id;

    const count = await incrementGlobalUserStat(userId, "smokeCount");
    const authorMention = `<@${userId}>`;

    const embed = new EmbedBuilder()
      .setDescription(
        `${authorMention}: You took a hit — that's \`${count}\` total <a:smok:1542640291654144082>`,
      )
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Smoke command handler:", err);
    Sentry.captureException(err);
  }
}
