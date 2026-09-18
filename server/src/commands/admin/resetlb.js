import { PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { resetLeaderboards } from "../../services/database.js";
import { EMBED_COLORS, errorEmbed } from "../../utils/embeds.js";
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
      required: false,
      choices: [
        { name: "All Games", value: "all" },
        { name: "Flag Game", value: "flag" },
        { name: "Pokémon Game", value: "pokemon" },
      ],
    },
  ],
};

export async function execute(interaction, client) {
  try {
    const member = interaction.member;
    const isOwner = interaction.user?.id === process.env.OWNER_ID;
    const hasPermission =
      isOwner ||
      member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
      member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      const denyEmbed = errorEmbed({
        title: "Permission Denied",
        description:
          "You need the `Manage Server` or `Administrator` permission to reset leaderboards.",
      });

      if (typeof interaction.reply === "function") {
        return interaction.reply({ embeds: [denyEmbed], flags: 64 });
      }
      return interaction.channel?.send({ embeds: [denyEmbed] });
    }

    const rawInput = (
      interaction.options?.getString("category") || ""
    ).toLowerCase();

    let category = "all";
    if (rawInput.includes("flag")) {
      category = "flag";
    } else if (rawInput.includes("poke") || rawInput.includes("pokemon")) {
      category = "pokemon";
    }

    const serverId = interaction.guild?.id;

    await resetLeaderboards(serverId, category);

    const catTitle =
      category === "flag"
        ? "Flag"
        : category === "pokemon"
          ? "Pokémon"
          : "All Game";

    const embed = new EmbedBuilder()
      .setTitle("🏆 Leaderboard Reset")
      .setDescription(
        `Successfully reset **${catTitle}** leaderboard scores to **0** for the server!`,
      )
      .setColor(EMBED_COLORS.SUCCESS);

    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ embeds: [embed] });
    }
    return interaction.reply({ embeds: [embed] });
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
