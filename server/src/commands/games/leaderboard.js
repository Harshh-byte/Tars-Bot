import { ComponentType, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import logger from "../../utils/logger.js";
import { EMOJI_IDS } from "../../utils/emojis.js";
import {
  getTopFlagPlayers,
  getTopPokemonPlayers,
  getTopScramblePlayers,
} from "../../services/database.js";

export const aliases = ["flb", "plb", "wslb", "lb"];

export const data = {
  name: "leaderboard",
  description: "View top game scorers.",
  dm_permission: false,
  options: [
    {
      name: "category",
      description: "Select a game category.",
      type: 3,
      required: true,
      choices: [
        { name: "Flag", value: "flag" },
        { name: "Pokemon", value: "pokemon" },
        { name: "Word", value: "scramble" },
      ],
    },
  ],
};

function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function truncateName(name, maxLen = 14) {
  if (!name) return "Unknown";
  return name.length > maxLen ? name.substring(0, maxLen - 1) + "…" : name;
}

async function renderLeaderboardCanvas(categoryName, pagePlayers, startIndex, currentPage, totalPages, themeColor = "#6366f1") {
  const width = 1200;
  const height = 750;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0b0f19");
  bg.addColorStop(0.5, "#14162e");
  bg.addColorStop(1, "#080914");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(600, 200, 50, 600, 200, 600);
  radial.addColorStop(0, `${themeColor}22`);
  radial.addColorStop(0.8, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(`${categoryName.toUpperCase()} LEADERBOARD`, 60, 75);

  ctx.fillStyle = themeColor;
  ctx.font = "700 22px sans-serif";
  ctx.fillText(`PAGE ${currentPage} OF ${totalPages}`, 60, 110);

  if (!pagePlayers || pagePlayers.length === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "italic 28px sans-serif";
    ctx.fillText("No scores recorded yet for this category!", 60, 220);
    return canvas.toBuffer("image/png");
  }

  const rowHeight = 96;
  const startY = 150;
  const leftColX = 60;
  const rightColX = 620;
  const colWidth = 520;

  for (let i = 0; i < pagePlayers.length; i++) {
    const player = pagePlayers[i];
    const globalRank = startIndex + i + 1;
    const isLeftCol = i < 5;
    const rowIdx = isLeftCol ? i : i - 5;
    const cardX = isLeftCol ? leftColX : rightColX;
    const cardY = startY + rowIdx * (rowHeight + 16);

    let rankColor = "rgba(255, 255, 255, 0.15)";
    let rankBadge = `${globalRank}`;
    let borderStroke = "rgba(255, 255, 255, 0.08)";
    let shadowGlow = "rgba(0, 0, 0, 0)";

    if (globalRank === 1) {
      rankColor = "#fbbf24";
      rankBadge = "1";
      borderStroke = "#f59e0b";
      shadowGlow = "rgba(245, 158, 11, 0.35)";
    } else if (globalRank === 2) {
      rankColor = "#94a3b8";
      rankBadge = "2";
      borderStroke = "#cbd5e1";
      shadowGlow = "rgba(148, 163, 184, 0.25)";
    } else if (globalRank === 3) {
      rankColor = "#d97706";
      rankBadge = "3";
      borderStroke = "#b45309";
      shadowGlow = "rgba(217, 119, 6, 0.25)";
    }

    ctx.save();
    ctx.shadowColor = shadowGlow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(18, 22, 38, 0.9)";
    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cardX, cardY, colWidth, rowHeight, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = rankColor;
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`#${rankBadge}`, cardX + 22, cardY + 56);

    if (player.avatarUrl) {
      try {
        const img = await loadImage(player.avatarUrl).catch(() => null);
        if (img) {
          ctx.save();
          const avatarSize = 60;
          const aX = cardX + 80;
          const aY = cardY + (rowHeight - avatarSize) / 2;
          ctx.beginPath();
          ctx.arc(aX + avatarSize / 2, aY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, aX, aY, avatarSize, avatarSize);
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(aX + avatarSize / 2, aY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = borderStroke;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
      } catch (_) {}
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(truncateName(player.displayName || player.username, 14), cardX + 155, cardY + 42);

    ctx.fillStyle = themeColor;
    ctx.font = "700 18px sans-serif";
    ctx.fillText(`${player.points || 0} pts`, cardX + 155, cardY + 70);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "500 16px sans-serif";
    ctx.fillText(`•  ${player.wins || 0} wins`, cardX + 265, cardY + 70);
  }

  return canvas.toBuffer("image/png");
}

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
          displayName: member.displayName || member.user.displayName || member.user.username,
          avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 128 }),
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
      : normalizedCat === "scramble"
        ? "Scramble"
        : "Flag";

  const colorHex =
    normalizedCat === "pokemon"
      ? 0xffcc00
      : normalizedCat === "scramble"
        ? 0x2ecc71
        : 0xed4245;

  const themeHexStr =
    normalizedCat === "pokemon"
      ? "#ffcc00"
      : normalizedCat === "scramble"
        ? "#2ecc71"
        : "#ed4245";

  const canvasBuffer = await renderLeaderboardCanvas(
    categoryName,
    pagePlayers,
    startIndex,
    currentPage,
    totalPages,
    themeHexStr,
  );
  const attachment = new AttachmentBuilder(canvasBuffer, {
    name: "leaderboard.png",
  });

  let userRankText = "";
  if (userRankInfo) {
    userRankText = `Your Rank: **#${userRankInfo.rank}** (${userRankInfo.points || 0} pts, ${userRankInfo.wins || 0} wins)`;
  } else if (activePlayers.length > 0) {
    userRankText = "You are not ranked yet in this category.";
  }

  const containerComponents = [
    {
      type: 10,
      content: `### 🏆 ${categoryName} Leaderboard\n${userRankText ? `-# ${userRankText}` : ""}`.trim(),
    },
    {
      type: 12,
      items: [
        {
          media: {
            url: "attachment://leaderboard.png",
          },
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
          style: 2,
          custom_id: `lb_prev_${normalizedCat}_${currentPage}`,
          emoji: { id: EMOJI_IDS.Left },
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
          emoji: { id: EMOJI_IDS.Right },
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
          style: normalizedCat === "scramble" ? 1 : 2,
          custom_id: `show_lb_scramble_${currentPage}`,
          label: "Word",
          emoji: { name: "🔤" },
        },
      ],
    },
  ];

  return {
    flags: 32768,
    files: [attachment],
    components: [
      {
        type: 17,
        accent_color: colorHex,
        components: containerComponents,
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
      } else if (customId.startsWith("show_lb_scramble")) {
        await showLeaderboard(btnInteraction, client, "scramble", 1);
      }
    } catch (err) {
      logger.error("Error in LB toggle collector:", err);
    }
  });
}
