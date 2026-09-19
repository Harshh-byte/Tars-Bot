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

export async function showLeaderboard(
  interaction,
  client,
  category = "flag",
  page = 1,
) {
  const guild = interaction.guild;
  const userId = interaction.user?.id || interaction.author?.id;
  const payload = await buildLbPayload(guild, category, page, userId);
  const response = await sendAndFetchReply(interaction, payload);

  attachLbToggleCollector(response, interaction, client, category, page);
}

async function buildLbPayload(guild, category, page = 1, userId = null) {
  const serverId = guild?.id;
  const isPokemon = category === "pokemon";
  const rawPlayers = isPokemon
    ? await getTopPokemonPlayers(serverId, 100)
    : await getTopFlagPlayers(serverId, 100);

  let activePlayers = [];
  let userRankInfo = null;

  if (rawPlayers && rawPlayers.length > 0 && guild) {
    for (const player of rawPlayers) {
      const member =
        guild.members.cache.get(player.userId) ||
        (await guild.members.fetch(player.userId).catch(() => null));
      if (member) {
        activePlayers.push({
          ...player,
          username: member.user.username,
        });
        if (userId && player.userId === userId && !userRankInfo) {
          userRankInfo = {
            rank: activePlayers.length,
            wins: player.wins,
            points: player.points,
          };
        }
      }
    }
  } else {
    activePlayers = rawPlayers || [];
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(activePlayers.length / itemsPerPage) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagePlayers = activePlayers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const categoryName = isPokemon ? "Pokémon" : "Flag";

  let bodyContent = "";
  if (!pagePlayers || pagePlayers.length === 0) {
    bodyContent = `No scores recorded yet!`;
  } else {
    bodyContent = pagePlayers
      .map((player, idx) => {
        const globalRank = startIndex + idx;
        const rankPrefix =
          globalRank === 0
            ? "🥇 "
            : globalRank === 1
              ? "🥈 "
              : globalRank === 2
                ? "🥉 "
                : `**${globalRank + 1}.** `;
        const displayName = player.username || player.userId;
        return `${rankPrefix}@${displayName}\n-# Guessed: ${player.wins} times`;
      })
      .join("\n\n");
  }

  let userRankText = "";
  if (userRankInfo) {
    userRankText = `\n\n-# Your Rank: #${userRankInfo.rank}`;
  } else if (userId) {
    userRankText = `\n\n-# Your Rank: Unranked`;
  }

  bodyContent += `${userRankText}\n-# Earn points by playing /${isPokemon ? "pokemon" : "flag"}!`;

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
            type: 1,
            components: [
              {
                type: 2,
                custom_id: `lb_prev_${category}_${currentPage}`,
                style: 2,
                emoji: { id: "1542658287894528100", name: "Left" },
                disabled: currentPage <= 1,
              },
              {
                type: 2,
                custom_id: `lb_page_count`,
                style: 2,
                label: `Page ${currentPage} of ${totalPages}`,
                disabled: true,
              },
              {
                type: 2,
                custom_id: `lb_next_${category}_${currentPage}`,
                style: 2,
                emoji: { id: "1542658241400414298", name: "Right" },
                disabled: currentPage >= totalPages,
              },
            ],
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
                custom_id: `show_lb_flag_${currentPage}`,
                style: !isPokemon ? 1 : 2,
                label: "Flag LB",
                emoji: { name: "🏁" },
              },
              {
                type: 2,
                custom_id: `show_lb_pokemon_${currentPage}`,
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

function attachLbToggleCollector(
  message,
  originalInteraction,
  client,
  currentCategory,
  currentPage,
) {
  if (!message || typeof message.createMessageComponentCollector !== "function")
    return;

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 86400000,
  });

  collector.on("collect", async (btnInteraction) => {
    try {
      const customId = btnInteraction.customId;
      if (customId.startsWith("lb_prev_")) {
        const parts = customId.split("_");
        const cat = parts[2];
        const page = parseInt(parts[3], 10) - 1;
        await showLeaderboard(btnInteraction, client, cat, page);
      } else if (customId.startsWith("lb_next_")) {
        const parts = customId.split("_");
        const cat = parts[2];
        const page = parseInt(parts[3], 10) + 1;
        await showLeaderboard(btnInteraction, client, cat, page);
      } else if (customId.startsWith("show_lb_flag")) {
        await showLeaderboard(btnInteraction, client, "flag", 1);
      } else if (customId.startsWith("show_lb_pokemon")) {
        await showLeaderboard(btnInteraction, client, "pokemon", 1);
      }
    } catch (err) {
      logger.error("Error in LB toggle collector:", err);
    }
  });
}
