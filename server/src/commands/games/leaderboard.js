import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import {
  getTopFlagPlayers,
  getTopPokemonPlayers,
} from "../../services/database.js";

export const aliases = ["flb", "plb", "lb"];

export const data = {
  name: "leaderboard",
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
    if (!interaction.replied && !interaction.deferred) {
      await interaction.update(payload).catch(() => null);
    } else {
      await interaction.editReply(payload).catch(() => null);
    }
    return (await interaction.fetchReply().catch(() => null)) || interaction.message;
  }
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload).catch(() => null);
  }
  const res = await interaction.reply({ ...payload, withResponse: true }).catch(() => null);
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
    cmdName === "flb" ||
    rawArgs.includes("flb") ||
    rawArgs.includes("flag")
  ) {
    lbCategory = "flag";
  } else if (!rawArgs) {
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
    userRankText = `Your Rank: **#${userRankInfo.rank}** (${userRankInfo.wins} wins)`;
  } else if (activePlayers.length > 0) {
    userRankText = "You are not ranked yet.";
  }

  const descriptionText = userRankText
    ? `${bodyContent}\n\n-# ${userRankText}`
    : bodyContent;

  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${categoryName} Leaderboard`)
    .setDescription(descriptionText)
    .setColor(isPokemon ? 0xffcc00 : 0xed4245);

  const pageRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_prev_${category}_${currentPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1542658287894528100")
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId("lb_page_count")
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`Page ${currentPage} of ${totalPages}`)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`lb_next_${category}_${currentPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1542658241400414298")
      .setDisabled(currentPage >= totalPages),
  );

  const categoryRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`show_lb_flag_${currentPage}`)
      .setStyle(!isPokemon ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setLabel("Flag LB")
      .setEmoji("🗺️"),
    new ButtonBuilder()
      .setCustomId(`show_lb_pokemon_${currentPage}`)
      .setStyle(isPokemon ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setLabel("Pokémon LB")
      .setEmoji("🔮"),
  );

  return {
    embeds: [embed],
    components: [pageRow, categoryRow],
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
