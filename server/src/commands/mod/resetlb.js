import {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { resetLeaderboards } from "../../services/database.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import logger from "../../utils/logger.js";

export const data = {
  name: "resetlb",
  description: "Reset game leaderboards.",
  dm_permission: false,
  options: [
    {
      name: "category",
      description: "Category to reset.",
      type: 3,
      required: true,
      choices: [
        { name: "All Games", value: "all" },
        { name: "Flag Game", value: "flag" },
        { name: "Pokémon Game", value: "pokemon" },
        { name: "Word Scramble", value: "scramble" },
      ],
    },
  ],
};

export async function execute(interaction) {
  try {
    const member = interaction.member;
    const isOwner = interaction.user?.id === process.env.OWNER_ID;
    const isExemptGuild =
      interaction.guild?.id &&
      process.env.EXEMPT_GUILD_ID &&
      interaction.guild.id === process.env.EXEMPT_GUILD_ID;

    const hasPermission =
      isOwner ||
      isExemptGuild ||
      member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
      member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      const denyEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setDescription(
          "<:Failed:1526228290413658184> You need the `Manage Server` or `Administrator` permission to reset leaderboards.",
        );

      if (typeof interaction.reply === "function") {
        return interaction.reply({ embeds: [denyEmbed], flags: 64 });
      }
      return interaction.channel?.send({ embeds: [denyEmbed] });
    }

    const rawInput = (interaction.options?.getString("category") || "")
      .trim()
      .toLowerCase();

    if (!rawInput) {
      const warnEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.WARNING)
        .setDescription(
          "<:Warning:1526228248458035381> Please specify a category to reset.",
        );
      if (typeof interaction.reply === "function") {
        return interaction.reply({ embeds: [warnEmbed], flags: 64 });
      }
      return interaction.channel?.send({ embeds: [warnEmbed] });
    }

    let category = null;
    if (rawInput.includes("flag")) {
      category = "flag";
    } else if (rawInput.includes("poke") || rawInput.includes("pokemon")) {
      category = "pokemon";
    } else if (
      rawInput.includes("scramble") ||
      rawInput.includes("word") ||
      rawInput.includes("ws")
    ) {
      category = "scramble";
    } else if (rawInput.includes("all")) {
      category = "all";
    } else {
      const warnEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.WARNING)
        .setDescription(
          "<:Warning:1526228248458035381> Invalid category specified.",
        );
      if (typeof interaction.reply === "function") {
        return interaction.reply({ embeds: [warnEmbed], flags: 64 });
      }
      return interaction.channel?.send({ embeds: [warnEmbed] });
    }

    const serverId = interaction.guild?.id;

    const catTitle =
      category === "flag"
        ? "Flag"
        : category === "pokemon"
          ? "Pokémon"
          : category === "scramble"
            ? "Word Scramble"
            : "All Games";

    const warnEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.WARNING)
      .setDescription(
        `<:Warning:1526228248458035381> Are you sure you want to reset the **${catTitle}** leaderboard?\n\n` +
          `This action will **permanently delete all scores** for this category. This cannot be undone!`,
      );

    const confirmBtn = new ButtonBuilder()
      .setCustomId("resetlb_confirm")
      .setLabel("Yes")
      .setStyle(ButtonStyle.Danger);

    const cancelBtn = new ButtonBuilder()
      .setCustomId("resetlb_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    let msg;
    if (interaction.deferred || interaction.replied) {
      msg = await interaction.followUp({
        embeds: [warnEmbed],
        components: [row],
        fetchReply: true,
      });
    } else if (typeof interaction.reply === "function") {
      await interaction.reply({
        embeds: [warnEmbed],
        components: [row],
      });
      msg = await interaction.fetchReply().catch(() => null);
    } else {
      msg = await interaction.channel?.send({
        embeds: [warnEmbed],
        components: [row],
      });
    }

    if (!msg || typeof msg.createMessageComponentCollector !== "function")
      return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    collector.on("collect", async (btnInteraction) => {
      if (
        btnInteraction.user.id !== interaction.user?.id &&
        btnInteraction.user.id !== interaction.author?.id
      ) {
        return btnInteraction.reply({
          content:
            "<:Failed:1526228290413658184> You cannot control this confirmation menu.",
          flags: 64,
        });
      }

      collector.stop("handled");

      if (btnInteraction.customId === "resetlb_confirm") {
        await resetLeaderboards(serverId, category);

        const sEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setDescription(
            `<:Success:1526228339910643793> Successfully reset the **${catTitle}** leaderboard!`,
          );

        await btnInteraction.update({
          embeds: [sEmbed],
          components: [],
        });
      } else {
        const cancelEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.GREY)
          .setDescription(
            "<:Failed:1526228290413658184> Reset operation cancelled. No data was deleted.",
          );

        await btnInteraction.update({
          embeds: [cancelEmbed],
          components: [],
        });
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "handled") {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.GREY)
          .setDescription("⌛ Reset timed out. No data was modified.");

        await msg
          .edit({ embeds: [timeoutEmbed], components: [] })
          .catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error executing resetlb command:", err);
    if (typeof interaction.reply === "function") {
      return interaction.reply({
        content: "An error occurred while resetting the leaderboard.",
        flags: 64,
      });
    }
  }
}
