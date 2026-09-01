import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import {
  getTopFlagPlayers,
  getTopPokemonPlayers,
} from "../../services/database.js";

export const aliases = ["flb", "plb", "flaglb", "pokelb", "guesslb"];

export const data = {
  name: "guessboard",
  description: "View top guessers in the server.",
  dm_permission: false,
  options: [
    {
      name: "category",
      description: "Select a category.",
      type: 3,
      required: true,
      choices: [
        { name: "Flag", value: "flag" },
        { name: "Pokemon", value: "pokemon" },
      ],
    },
  ],
};

function buildLbToggleRow(currentCategory = "flag") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("show_lb_flag")
      .setLabel("Flag LB")
      .setEmoji("🏁")
      .setStyle(
        currentCategory === "flag"
          ? ButtonStyle.Primary
          : ButtonStyle.Secondary
      ),
    new ButtonBuilder()
      .setCustomId("show_lb_pokemon")
      .setLabel("Pokémon LB")
      .setEmoji("⚡")
      .setStyle(
        currentCategory === "pokemon"
          ? ButtonStyle.Primary
          : ButtonStyle.Secondary
      )
  );
}

export async function execute(interaction, client) {
  const cmdName = (interaction.commandName || "").toLowerCase();
  const selectedCategory =
    interaction.options?.getString("category")?.toLowerCase() || "";
  const rawArgs = (
    interaction.options?.getString("category") ||
    interaction.options?.getString("getString") ||
    ""
  ).toLowerCase();

  let lbCategory = selectedCategory || "flag";
  if (
    cmdName === "pklb" ||
    cmdName === "plb" ||
    rawArgs.includes("pokemon") ||
    rawArgs.includes("plb")
  ) {
    lbCategory = "pokemon";
  } else if (
    cmdName === "flb" ||
    cmdName === "flaglb" ||
    rawArgs.includes("flb") ||
    rawArgs.includes("flag")
  ) {
    lbCategory = "flag";
  }

  return showLeaderboard(interaction, client, lbCategory);
}

export async function showLeaderboard(interaction, client, category = "flag") {
  const serverId = interaction.guild?.id;
  if (!serverId) {
    const errorPayload = {
      content: "Leaderboard is only available inside a server!",
      ephemeral: true,
    };
    return interaction.isButton && interaction.isButton()
      ? interaction.reply(errorPayload)
      : interaction.replied || interaction.deferred
        ? interaction.followUp(errorPayload)
        : interaction.reply(errorPayload);
  }

  const payload = await buildLbPayload(
    serverId,
    category,
    interaction.guild.name
  );

  let response;
  if (interaction.isButton && interaction.isButton()) {
    response = await interaction.update({ ...payload, fetchReply: true });
  } else if (interaction.replied || interaction.deferred) {
    response = await interaction.followUp({ ...payload, fetchReply: true });
  } else {
    response = await interaction.reply({ ...payload, fetchReply: true });
  }

  attachLbToggleCollector(response, interaction, client);
}

async function buildLbPayload(serverId, category, guildName) {
  const isPokemon = category === "pokemon";
  const topPlayers = isPokemon
    ? await getTopPokemonPlayers(serverId, 10)
    : await getTopFlagPlayers(serverId, 10);

  const categoryName = isPokemon ? "Pokémon" : "Flag";

  let embed;
  if (!topPlayers || topPlayers.length === 0) {
    embed = new EmbedBuilder()
      .setTitle(`🏆 **${categoryName} Leaderboard**`)
      .setDescription(
        `No scores recorded yet! Play \`/${isPokemon ? "pokemon" : "flag"}\` to score points!`
      )
      .setColor(EMBED_COLORS.WHITE);
  } else {
    const leaderboardLines = topPlayers.map((player, index) => {
      const medal =
        index === 0 ? "🥇 " : index === 1 ? "🥈 " : index === 2 ? "🥉 " : "";
      return `${medal}<@${player.userId}> — **${player.points}** Pts *(${player.wins} guessed)*`;
    });

    embed = new EmbedBuilder()
      .setTitle(`🏆 **${categoryName} Leaderboard**`)
      .setDescription(leaderboardLines.join("\n"))
      .setFooter({
        text: `Earn points by playing /${isPokemon ? "pokemon" : "flag"}!`,
      })
      .setColor(EMBED_COLORS.SUCCESS);
  }

  const toggleRow = buildLbToggleRow(category);
  return { embeds: [embed], components: [toggleRow] };
}

function attachLbToggleCollector(message, originalInteraction, client) {
  if (!message || typeof message.createMessageComponentCollector !== "function")
    return;

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 86400000,
  });

  collector.on("collect", async (btnInteraction) => {
    try {
      if (btnInteraction.customId === "show_lb_flag") {
        await showLeaderboard(btnInteraction, client, "flag");
      } else if (btnInteraction.customId === "show_lb_pokemon") {
        await showLeaderboard(btnInteraction, client, "pokemon");
      }
    } catch (err) {
      logger.error("Error in LB toggle collector:", err);
    }
  });
}
