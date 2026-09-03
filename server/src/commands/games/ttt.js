import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

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

const getRandomColor = () => Math.floor(Math.random() * 16777215);

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const res = await interaction.reply({ ...payload, withResponse: true });
  return res?.resource?.message || res;
}

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
    const row = {
      type: 1,
      components: [],
    };
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const cellVal = board[idx];

      const btn = {
        type: 2,
        custom_id: `ttt_${idx}`,
        disabled: disabled || cellVal !== null,
      };

      if (cellVal === "X") {
        btn.emoji = { id: "1542154950065524757", name: "x_" };
        btn.style = 4; // Danger (Red)
      } else if (cellVal === "O") {
        btn.emoji = { id: "1542154996013863023", name: "o_" };
        btn.style = 3; // Success (Green)
      } else {
        btn.label = "​";
        btn.style = 2; // Secondary (Grey)
      }
      row.components.push(btn);
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

function buildV2GridPayload(board, turnUserId, playerXName, playerOName, playerXId, isVsTars, disabled = false) {
  const symbol = turnUserId === playerXId ? SYMBOLS.X : SYMBOLS.O;
  const gridRows = buildGridComponents(board, disabled);

  const containerComponents = [
    {
      type: 10,
      content: "### ⚔️ TIC-TAC-TOE",
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: `**${playerXName}** vs **${playerOName}**\n\nTurn: ${symbol} <@${turnUserId}>\n\n-# Requestor: <@${playerXId}>`,
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    ...gridRows,
  ];

  return {
    content: (!disabled && !isVsTars) ? `<@${turnUserId}>` : null,
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: getRandomColor(),
        components: containerComponents,
      },
    ],
  };
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

    const initialPayload = buildV2GridPayload(board, turnUserId, playerXName, playerOName, playerX.id, isVsTars);
    const response = await sendAndFetchReply(interaction, initialPayload);

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 86400000,
    });

    const handleGameEnd = async (winner, lastInteraction) => {
      collector.stop(winner);

      let winnerText = "";
      if (winner === "X") {
        winnerText = `<a:Tada:1544329561955770488> **<@${playerX.id}> won the match!**`;
      } else if (winner === "O") {
        const winnerMention = isVsTars ? "**Tars**" : `<@${playerO.id}>`;
        winnerText = `<a:Tada:1544329561955770488> **${winnerMention} won the match!**` + (isVsTars ? `\n\n*Tars: "Predictable outcome."*` : "");
      } else if (winner === "TIE") {
        winnerText = `🤝 **It's a Tie Game!**`;
      }

      const v2EndPayload = {
        content: null,
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: getRandomColor(),
            components: [
              {
                type: 10,
                content: "### ⚔️ TIC-TAC-TOE MATCH RESULTS",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: `${winnerText}\n\n-# Requestor: <@${playerX.id}>`,
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
                    custom_id: "ttt_play_again",
                    style: 1,
                    label: "Play Again",
                  },
                ],
              },
            ],
          },
        ],
      };

      await lastInteraction.update(v2EndPayload);

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

      await i.update(buildV2GridPayload(board, turnUserId, playerXName, playerOName, playerX.id, isVsTars));
      collector.resetTimer();
    });

    collector.on("end", async (_, reason) => {
      if (["X", "O", "TIE"].includes(reason)) return;

      const timeoutContainer = {
        content: null,
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: getRandomColor(),
            components: [
              {
                type: 10,
                content: "### <:Timer:1542147643021725796> Match Timed Out",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: `The game was cancelled due to inactivity.\n\n-# Requestor: <@${playerX.id}>`,
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              ...buildGridComponents(board, true),
            ],
          },
        ],
      };

      await response.edit(timeoutContainer).catch(() => null);
    });
  } catch (err) {
    logger.error("Error in Tic-Tac-Toe command handler:", err);
    Sentry.captureException(err);
  }
}
