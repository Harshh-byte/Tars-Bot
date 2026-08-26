import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { updateServerSettings } from "../../services/database.js";

export const aliases = ["pref"];

export const data = {
  name: "prefix",
  description: "View or change command prefix.",
  dm_permission: false,
  options: [
    {
      name: "new_prefix",
      description: "New prefix.",
      type: 3,
      required: false,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    const newPrefix = interaction.options?.getString("new_prefix");
    const serverId = interaction.guild?.id || "DM";

    if (!newPrefix || newPrefix.trim() === "") {
      const currentPrefix = client.prefixCache?.get(serverId) || ".";
      const embed = new EmbedBuilder()
        .setDescription(`|>  Server prefix is \`${currentPrefix}\``)
        .setColor(EMBED_COLORS.GREY);
      return interaction.reply({ embeds: [embed] });
    }

    if (
      interaction.member?.permissions &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.user.id !== process.env.OWNER_ID
    ) {
      const errEmbed = new EmbedBuilder()
        .setDescription("You need the `Manage Server` permission to change the bot prefix.")
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    const cleanedPrefix = newPrefix.trim();
    if (cleanedPrefix.length > 5) {
      const errEmbed = new EmbedBuilder()
        .setDescription("Prefix cannot be longer than 5 characters.")
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    if (!client.prefixCache) client.prefixCache = new Map();
    client.prefixCache.set(serverId, cleanedPrefix);

    if (serverId !== "DM") {
      await updateServerSettings(serverId, "prefix", cleanedPrefix).catch((err) => {
        logger.error("Failed to save prefix to database:", err);
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(`|>  Server prefix changed to \`${cleanedPrefix}\``)
      .setColor(EMBED_COLORS.GREY);

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in Prefix command handler:", err);
    Sentry.captureException(err);
  }
}
