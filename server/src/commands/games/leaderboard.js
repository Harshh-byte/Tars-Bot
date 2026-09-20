import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import {
  getTopFlagPlayers,
  getTopPokemonPlayers,
  getTopLogoPlayers,
  getTopScramblePlayers,
} from "../../services/database.js";

export const aliases = ["flb", "plb", "blb", "logolb", "wslb", "lb"];

export const data = {
  name: "leaderboard",
  description: "View top game scorers.",
  dm_permission: false,
  options: [
    {
      name: "category",
      description: "Select a game category",
      type: 3,
      required: true,
      choices: [
        { name: "Flag", value: "flag" },
        { name: "Pokemon", value: "pokemon" },
        { name: "Logo", value: "logo" },
        { name: "Word", value: "scramble" },
      ],
    },
  ],
};

async function sendAndFetchReply(interaction, payload) {
  if (typeof interaction.isButton === "function" && interaction.isButton()) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.update(payload).catch(() => null);
    } else {
      await interaction.editReply(payload).catch(() => null);
    }
    return (
      (await interaction.fetchReply().catch(() => null)) || interaction.message
    );
  }
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload).catch(() => null);
  }
  const res = await interaction
    .reply({ ...payload, withResponse: true })
    .catch(() => null);
  return res?.resource?.message || res;
}

export async function execute(interaction, client) {
  const cmdName = (interaction.commandName || "").toLowerCase();
  let rawArgs = "";
  if (typeof interaction.options?.getString === "function") {
    try {
      rawArgs = (interaction.options.getString("category") || "").toLowerCase();
    } catch (_) {}
  }

  let lbCategory = rawArgs || "flag";

  if (
    cmdName === "pklb" ||
    cmdName === "plb" ||
    rawArgs.includes("pokemon") ||
    rawArgs.includes("plb") ||
    rawArgs.includes("pk")
  ) {
    lbCategory = "pokemon";
  } else if (
    cmdName === "blb" ||
    cmdName === "logolb" ||
    rawArgs.includes("logo") ||
    rawArgs.includes("brand") ||
    rawArgs.includes("blb")
  ) {
    lbCategory = "logo";
  } else if (
    cmdName === "wslb" ||
    rawArgs.includes("scramble") ||
    rawArgs.includes("wslb") ||
    rawArgs.includes("word")
  ) {
    lbCategory = "scramble";
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
  const normalizedCat = category === "brand" ? "logo" : category;

  const rawPlayers =
    normalizedCat === "pokemon"
      ? await getTopPokemonPlayers(serverId, 100)
      : normalizedCat === "logo"
        ? await getTopLogoPlayers(serverId, 100)
        : normalizedCat === "scramble"
          ? await getTopScramblePlayers(serverId, 100)
          : await getTopFlagPlayers(serverId, 100);

  let activePlayers = [];
  let userRankInfo = null;

  if (rawPlayers && rawPlayers.length > 0 && guild) {
    for (const player of rawPlayers) {
      if ((player.points || 0) <= 0 && (player.wins || 0) <= 0) continue;
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
    activePlayers = (rawPlayers || []).filter(
      (p) => (p.points || 0) > 0 || (p.wins || 0) > 0,
    );
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(activePlayers.length / itemsPerPage) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagePlayers = activePlayers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const categoryName =
    normalizedCat === "pokemon"
      ? "Pokémon"
      : normalizedCat === "logo"
        ? "Logo"
        : normalizedCat === "scramble"
          ? "Scramble"
          : "Flag";

  const colorHex =
    normalizedCat === "pokemon"
      ? 0xffcc00
      : normalizedCat === "logo"
        ? 0x5865f2
        : normalizedCat === "scramble"
          ? 0x2ecc71
          : 0xed4245;

  let bodyContent = "";
  if (!pagePlayers || pagePlayers.length === 0) {
    bodyContent = `No scores recorded yet for ${categoryName}!`;
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
        return `${rankPrefix}@${displayName} - ${player.points || 0}pts\n-# Guessed: ${player.wins} times`;
      })
      .join("\n\n");
  }

  let userRankText = "";
  if (userRankInfo) {
    userRankText = `Your Rank: **#${userRankInfo.rank}**`;
  } else if (activePlayers.length > 0) {
    userRankText = "You are not ranked yet.";
  }

  const fullText = userRankText
    ? `${bodyContent}\n\n-# ${userRankText}`
    : bodyContent;

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: colorHex,
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
            content: fullText,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                custom_id: `lb_prev_${normalizedCat}_${currentPage}`,
                emoji: { id: "1542658287894528100" },
                disabled: currentPage <= 1,
              },
              {
                type: 2,
                style: 2,
                custom_id: "lb_page_count",
                label: `Page ${currentPage} of ${totalPages}`,
                disabled: true,
              },
              {
                type: 2,
                style: 2,
                custom_id: `lb_next_${normalizedCat}_${currentPage}`,
                emoji: { id: "1542658241400414298" },
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
                style: normalizedCat === "flag" ? 1 : 2,
                custom_id: `show_lb_flag_${currentPage}`,
                label: "Flag",
                emoji: { name: "🗺️" },
              },
              {
                type: 2,
                style: normalizedCat === "pokemon" ? 1 : 2,
                custom_id: `show_lb_pokemon_${currentPage}`,
                label: "Pokémon",
                emoji: { name: "🔮" },
              },
              {
                type: 2,
                style: normalizedCat === "logo" ? 1 : 2,
                custom_id: `show_lb_logo_${currentPage}`,
                label: "Logo",
                emoji: { name: "🏷️" },
              },
              {
                type: 2,
                style: normalizedCat === "scramble" ? 1 : 2,
                custom_id: `show_lb_scramble_${currentPage}`,
                label: "Word",
                emoji: { name: "🔤" },
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
      } else if (
        customId.startsWith("show_lb_logo") ||
        customId.startsWith("show_lb_brand")
      ) {
        await showLeaderboard(btnInteraction, client, "logo", 1);
      } else if (customId.startsWith("show_lb_scramble")) {
        await showLeaderboard(btnInteraction, client, "scramble", 1);
      }
    } catch (err) {
      logger.error("Error in LB toggle collector:", err);
    }
  });
}
