import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import {
  getTopFlagPlayers,
  getTopPokemonPlayers,
} from "../../services/database.js";

export const aliases = ["flb", "plb", "guesslb"];

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

async function sendAndFetchReply(interaction, payload) {
  if (interaction.isButton && interaction.isButton()) {
    await interaction.update(payload);
    return await interaction.fetchReply();
  }
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const res = await interaction.reply({ ...payload, withResponse: true });
  return res?.resource?.message || res;
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
    rawArgs.includes("flb") ||
    rawArgs.includes("flag")
  ) {
    lbCategory = "flag";
  }

  return showLeaderboard(interaction, client, lbCategory);
}

export async function showLeaderboard(interaction, client, category = "flag") {
  const serverId = interaction.guild?.id;
  const payload = await buildLbPayload(serverId, category);
  const response = await sendAndFetchReply(interaction, payload);

  attachLbToggleCollector(response, interaction, client);
}

async function buildLbPayload(serverId, category) {
  const isPokemon = category === "pokemon";
  const topPlayers = isPokemon
    ? await getTopPokemonPlayers(serverId, 10)
    : await getTopFlagPlayers(serverId, 10);

  const categoryName = isPokemon ? "Pokémon" : "Flag";

  let bodyContent = "";
  if (!topPlayers || topPlayers.length === 0) {
    bodyContent = `No scores recorded yet!`;
  } else {
    bodyContent = topPlayers
      .map((player, index) => {
        const rankPrefix =
          index === 0
            ? "🥇 "
            : index === 1
            ? "🥈 "
            : index === 2
            ? "🥉 "
            : `\`${index + 1}.\` `;
        return `${rankPrefix}<@${player.userId}> — **${player.points}** Pts *(${player.wins} guessed)*`;
      })
      .join("\n");
  }

  bodyContent += `\n\n-# Earn points by playing /${isPokemon ? "pokemon" : "flag"}!`;

  return {
    flags: 32768,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.WHITE,
        components: [
          {
            type: 10,
            content: `### 🏆 ${categoryName} Leaderboard`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: bodyContent,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: "show_lb_flag",
                style: !isPokemon ? 1 : 2,
                label: "Flag LB",
                emoji: { name: "🏁" },
              },
              {
                type: 2,
                custom_id: "show_lb_pokemon",
                style: isPokemon ? 1 : 2,
                label: "Pokémon LB",
                emoji: { name: "⚡" },
              },
            ],
          },
        ],
      },
    ],
  };
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
