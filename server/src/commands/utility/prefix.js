import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS, errorEmbed } from "../../utils/embeds.js";
import { updateServerSettings } from "../../services/database.js";

export const data = {
  name: "prefix",
  description: "View or change prefix.",
  dm_permission: false,
  options: [
    {
      type: 1,
      name: "set",
      description: "Set a new prefix.",
      options: [
        {
          name: "prefix",
          description: "New prefix.",
          type: 3,
          required: true,
        },
      ],
    },
    {
      type: 1,
      name: "view",
      description: "View server prefix.",
    },
  ],
};

export async function execute(interaction, client) {
  try {
    const serverId = interaction.guild?.id || "DM";
    let subcommand = null;
    try {
      subcommand = interaction.options?.getSubcommand(false);
    } catch {}

    const rawInput =
      interaction.options?.getString("prefix") ||
      interaction.options?.getString("getString") ||
      "";

    let newPrefix = "";
    if (subcommand === "set") {
      newPrefix = rawInput.trim();
    } else if (rawInput.trim().toLowerCase().startsWith("set ")) {
      newPrefix = rawInput.trim().slice(4).trim();
    } else if (rawInput.trim().toLowerCase() === "set") {
      newPrefix = "";
    } else {
      newPrefix = rawInput.trim();
    }

    if (!newPrefix) {
      const currentPrefix = client.prefixCache?.get(serverId) || ".";
      const embed = new EmbedBuilder()
        .setDescription(
          `<:Prefix:1542236764465274910> Server prefix is \`${currentPrefix}\``,
        )
        .setColor(EMBED_COLORS.WHITE);
      return interaction.reply({ embeds: [embed] });
    }

    if (
      interaction.member?.permissions &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.user.id !== process.env.OWNER_ID
    ) {
      const errEmbed = errorEmbed({
        title: "Permission Denied",
        description:
          "You need the `Manage Server` permission to change the bot prefix.",
      });
      return interaction.reply({ embeds: [errEmbed], flags: 64 });
    }

    const cleanedPrefix = newPrefix.trim();
    if (cleanedPrefix.length > 5) {
      const errEmbed = errorEmbed({
        title: "Invalid Prefix",
        description: "Prefix cannot be longer than 5 characters.",
      });
      return interaction.reply({ embeds: [errEmbed], flags: 64 });
    }

    if (!client.prefixCache) client.prefixCache = new Map();
    client.prefixCache.set(serverId, cleanedPrefix);

    if (serverId !== "DM") {
      await updateServerSettings(serverId, "prefix", cleanedPrefix).catch(
        (err) => {
          logger.error("Failed to save prefix to database:", err);
        },
      );
    }

    const sEmbed = new EmbedBuilder()
      .setDescription(
        `<:Prefix:1542236764465274910> Server prefix changed to \`${cleanedPrefix}\``,
      )
      .setColor(EMBED_COLORS.WHITE);

    await interaction.reply({ embeds: [sEmbed] });
  } catch (err) {
    logger.error("Error in Prefix command handler:", err);
    Sentry.captureException(err);
  }
}
