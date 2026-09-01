import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const data = {
  name: "ttt",
  description: "Play Tic-Tac-Toe.",
  dm_permission: false,
  options: [
    {
      name: "opponent",
      description: "User to challenge.",
      type: 6,
      required: false,
    },
  ],
};

const SYMBOLS = {
  X: "<:x_:1542154950065524757>",
  O: "<:o_:1542154996013863023>",
  EMPTY: "",
};

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) {
    return "TIE";
  }
  return null;
}

function buildGridComponents(board, disabled = false) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const cellVal = board[idx];
      const btn = new ButtonBuilder()
        .setCustomId(`ttt_${idx}`)
        .setDisabled(disabled || cellVal !== null);

      if (cellVal === "X") {
        btn.setEmoji(SYMBOLS.X).setStyle(ButtonStyle.Danger);
      } else if (cellVal === "O") {
        btn.setEmoji(SYMBOLS.O).setStyle(ButtonStyle.Success);
      } else {
        btn.setLabel("​").setStyle(ButtonStyle.Secondary);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

function getBestTarsMove(board) {
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      if (checkWinner(board) === "O") {
        board[i] = null;
        return i;
      }
      board[i] = null;
    }
  }
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "X";
      if (checkWinner(board) === "X") {
        board[i] = null;
        return i;
      }
      board[i] = null;
    }
  }
  if (!board[4]) return 4;
  const corners = [0, 2, 6, 8].filter((idx) => !board[idx]);
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  const openSpots = board.map((val, idx) => (val === null ? idx : null)).filter((val) => val !== null);
  return openSpots[Math.floor(Math.random() * openSpots.length)];
}

export async function execute(interaction, client) {
  const opponent = interaction.options?.getUser("opponent") || null;
  return startGame(interaction, client, opponent);
}

async function startGame(interaction, client, opponent) {
  try {
    const isVsTars = !opponent || opponent.id === client.user.id;

    if (!isVsTars) {
      if (opponent.bot) {
        return interaction.reply({
          content: "You cannot challenge other bots to Tic-Tac-Toe!",
          ephemeral: true,
        });
      }
      if (opponent.id === interaction.user.id) {
        return interaction.reply({
          content: "You can't play against yourself! Leave the opponent option blank to play with Tars.",
          ephemeral: true,
        });
      }
    }

    const board = Array(9).fill(null);
    let turnUserId = interaction.user.id;
    const playerX = interaction.user;
    const playerO = isVsTars ? client.user : opponent;

    const playerXName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    const playerOName = isVsTars
      ? "Tars"
      : (interaction.guild?.members.cache.get(opponent.id)?.displayName || opponent.displayName || opponent.username);

    const getEmbed = (winner = null) => {
      const embed = new EmbedBuilder().setTitle("⚔️ **TIC-TAC-TOE**");

      if (winner === "X") {
        embed
          .setDescription(`<a:Tada:1544329561955770488> **<@${playerX.id}> won the match!**`)
          .setColor(EMBED_COLORS.SUCCESS);
      } else if (winner === "O") {
        const oColor = isVsTars ? EMBED_COLORS.ERROR : EMBED_COLORS.SUCCESS;
        const winnerMention = isVsTars ? "**Tars**" : `<@${playerO.id}>`;
        embed
          .setDescription(
            `<a:Tada:1544329561955770488> **${winnerMention} won the match!**` +
            (isVsTars ? `\n\n*Tars: "Predictable outcome."*` : "")
          )
          .setColor(oColor);
      } else if (winner === "TIE") {
        embed
          .setDescription(`🤝 **It's a Tie Game!**`)
          .setColor(EMBED_COLORS.WARNING);
      } else {
        const symbol = turnUserId === playerX.id ? SYMBOLS.X : SYMBOLS.O;
        embed
          .setDescription(
            `**${playerXName}** vs **${playerOName}**\n\n` +
            `Turn: ${symbol} **<@${turnUserId}>**`
          )
          .setColor(Math.floor(Math.random() * 16777215));
      }

      embed.setFooter({ text: `Requestor: ${playerXName}` });
      return embed;
    };

    const getContent = (winner = null) => {
      if (winner) return null;
      if (isVsTars) return undefined;
      return `<@${turnUserId}>`;
    };

    const replyPayload = {
      content: getContent(),
      embeds: [getEmbed()],
      components: buildGridComponents(board),
      fetchReply: true,
    };

    const response = interaction.replied || interaction.deferred
      ? await interaction.followUp(replyPayload)
      : interaction.isButton()
      ? await interaction.update(replyPayload) || await interaction.fetchReply()
      : await interaction.reply(replyPayload);

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 86400000,
    });

    const handleGameEnd = async (winner, lastInteraction) => {
      collector.stop(winner);
      const playAgainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ttt_play_again")
          .setLabel("Play Again")
          .setStyle(ButtonStyle.Primary)
      );

      await lastInteraction.update({
        content: getContent(winner),
        embeds: [getEmbed(winner)],
        components: [playAgainRow],
      });

      const playAgainCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 86400000,
      });

      playAgainCollector.on("collect", async (paInteraction) => {
        if (paInteraction.customId === "ttt_play_again") {
          const allowedIds = isVsTars ? [playerX.id] : [playerX.id, playerO.id];
          if (!allowedIds.includes(paInteraction.user.id)) {
            return paInteraction.reply({
              content: "You were not part of this game!",
              ephemeral: true,
            });
          }
          playAgainCollector.stop("restarted");

          const newOpponent = isVsTars
            ? null
            : paInteraction.user.id === interaction.user.id
            ? opponent
            : interaction.user;

          return startGame(paInteraction, client, newOpponent);
        }
      });
    };

    collector.on("collect", async (i) => {
      if (i.user.id !== turnUserId) {
        return i.reply({
          content: `It's not your turn right now! Waiting for <@${turnUserId}>.`,
          ephemeral: true,
        });
      }

      const moveIdx = parseInt(i.customId.replace("ttt_", ""), 10);
      if (board[moveIdx] !== null) {
        return i.reply({ content: "That spot is already taken!", ephemeral: true });
      }

      board[moveIdx] = turnUserId === playerX.id ? "X" : "O";

      let winner = checkWinner(board);

      if (winner) {
        return handleGameEnd(winner, i);
      }

      turnUserId = turnUserId === playerX.id ? playerO.id : playerX.id;

      if (isVsTars && turnUserId === client.user.id) {
        const tarsMove = getBestTarsMove(board);
        board[tarsMove] = "O";

        winner = checkWinner(board);
        turnUserId = playerX.id;

        if (winner) {
          return handleGameEnd(winner, i);
        }
      }

      await i.update({
        content: getContent(),
        embeds: [getEmbed()],
        components: buildGridComponents(board),
      });
      collector.resetTimer();
    });

    collector.on("end", async (_, reason) => {
      if (["X", "O", "TIE"].includes(reason)) return;

      const timeoutEmbed = new EmbedBuilder()
        .setTitle("<:Timer:1542147643021725796> Match Timed Out")
        .setDescription("The game was cancelled due to inactivity.")
        .setColor(EMBED_COLORS.TIMEOUT);

      await response.edit({
        embeds: [timeoutEmbed],
        components: buildGridComponents(board, true),
      }).catch(() => null);
    });
  } catch (err) {
    logger.error("Error in Tic-Tac-Toe command handler:", err);
    Sentry.captureException(err);
  }
}
