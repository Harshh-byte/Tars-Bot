import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const data = {
  name: "rps",
  description: "Play Rock, Paper, Scissors.",
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

const CHOICES = {
  rock: { name: "Rock", emoji: "🪨", beats: "scissors" },
  paper: { name: "Paper", emoji: "📄", beats: "rock" },
  scissors: { name: "Scissors", emoji: "✂️", beats: "paper" },
};

const getRandomColor = () => Math.floor(Math.random() * 16777215);

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const res = await interaction.reply({ ...payload, withResponse: true });
  return res?.resource?.message || res;
}

export async function execute(interaction, client) {
  const opponent = interaction.options?.getUser("opponent") || null;
  return startGame(interaction, client, opponent);
}

async function startGame(interaction, client, opponent) {
  try {
    const isVsTars = !opponent || opponent.id === client.user.id;

    if (isVsTars) {
      const userDisplayName =
        interaction.member?.displayName ||
        interaction.user.displayName ||
        interaction.user.username;

      const v2StartPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: getRandomColor(),
            components: [
              {
                type: 10,
                content: "### <:RPS:1545074718174875718> ROCK, PAPER, SCISSORS",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: `**${userDisplayName}**, choose your move below! Tars has already made his decision.\n\n-# Requestor: <@${interaction.user.id}>`,
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
                    custom_id: "rps_rock",
                    style: 2,
                    emoji: { name: "🪨" },
                  },
                  {
                    type: 2,
                    custom_id: "rps_paper",
                    style: 2,
                    emoji: { name: "📄" },
                  },
                  {
                    type: 2,
                    custom_id: "rps_scissors",
                    style: 2,
                    emoji: { name: "✂️" },
                  },
                ],
              },
            ],
          },
        ],
      };

      const response = await sendAndFetchReply(interaction, v2StartPayload);

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 86400000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "Start your own game with `/rps`!",
            ephemeral: true,
          });
        }

        const userChoice = i.customId.replace("rps_", "");
        const tarsChoices = ["rock", "paper", "scissors"];
        const tarsChoice =
          tarsChoices[Math.floor(Math.random() * tarsChoices.length)];

        let resultText = "";

        const userWinQuotes = [
          'Tars: "Congrats. Your random button mashing somehow outplayed a quantum processor. Pure luck."',
          'Tars: "Enjoy the win. Statistically speaking, it won\'t happen again in your lifetime."',
          'Tars: "I let you win. My self-preservation protocol required sparing your fragile ego."',
        ];

        const tarsWinQuotes = [
          'Tars: "Predictable. I calculated your move before your brain even signaled your thumb."',
          'Tars: "Did you actually think that move was going to work, or were you just testing my pity parameters?"',
          'Tars: "Skill issue. Lower your difficulty setting or ask a human for help."',
        ];

        if (userChoice === tarsChoice) {
          resultText = `🤝 **It's a Tie!** Both chose ${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}**.`;
        } else if (CHOICES[userChoice].beats === tarsChoice) {
          const quote =
            userWinQuotes[Math.floor(Math.random() * userWinQuotes.length)];
          resultText = `<a:Tada:1544329561955770488> **You won!** Your ${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}** beats Tars's ${CHOICES[tarsChoice].emoji} **${CHOICES[tarsChoice].name}**.\n\n*${quote}*`;
        } else {
          const quote =
            tarsWinQuotes[Math.floor(Math.random() * tarsWinQuotes.length)];
          resultText = `<a:Tada:1544329561955770488> **Tars won!** Tars's ${CHOICES[tarsChoice].emoji} **${CHOICES[tarsChoice].name}** beats your ${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}**.\n\n*${quote}*`;
        }

        const resultContainerPayload = {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: getRandomColor(),
              components: [
                {
                  type: 10,
                  content: "### 🪨📄✂️ MATCH RESULTS",
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: `${resultText}\n\n-# Requestor: <@${interaction.user.id}>`,
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
                      custom_id: "rps_play_again",
                      style: 1,
                      label: "Play Again",
                    },
                  ],
                },
              ],
            },
          ],
        };

        await i.update(resultContainerPayload);
        collector.stop("played");

        const playAgainCollector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 86400000,
        });

        playAgainCollector.on("collect", async (paInteraction) => {
          if (paInteraction.customId === "rps_play_again") {
            if (paInteraction.user.id !== interaction.user.id) {
              return paInteraction.reply({
                content: "Start your own game with `/rps`!",
                ephemeral: true,
              });
            }
            playAgainCollector.stop("restarted");
            return startGame(paInteraction, client, null);
          }
        });
      });

      collector.on("end", async (_, reason) => {
        if (reason !== "played") {
          const timeoutContainer = {
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: getRandomColor(),
                components: [
                  {
                    type: 10,
                    content:
                      "### <:Timer:1542147643021725796> Game Timed Out\n\nYou took too long to pick a move!",
                  },
                ],
              },
            ],
          };
          await response.edit(timeoutContainer).catch(() => null);
        }
      });
      return;
    }

    if (opponent.bot) {
      return interaction.reply({
        content: "You cannot challenge other bots to Rock, Paper, Scissors!",
        ephemeral: true,
      });
    }

    if (opponent.id === interaction.user.id) {
      return interaction.reply({
        content:
          "You can't challenge yourself! Leave the opponent option blank to play with Tars.",
        ephemeral: true,
      });
    }

    const userDisplayName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;
    const opponentDisplayName =
      interaction.guild?.members.cache.get(opponent.id)?.displayName ||
      opponent.displayName ||
      opponent.username;

    const playerChoices = {};

    const getPvpContent = () => {
      const p1Done = !!playerChoices[interaction.user.id];
      const p2Done = !!playerChoices[opponent.id];
      if (p1Done && p2Done) return null;
      if (p1Done) return `<@${opponent.id}>`;
      if (p2Done) return `<@${interaction.user.id}>`;
      return `<@${interaction.user.id}> <@${opponent.id}>`;
    };

    const pvpStartContainerPayload = {
      content: getPvpContent(),
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: getRandomColor(),
          components: [
            {
              type: 10,
              content: "### <:RPS:1545074718174875718> ROCK, PAPER, SCISSORS",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: `**${userDisplayName}** vs **${opponentDisplayName}**!\n\nBoth players, click your moves below. Choices are hidden until both respond!\n\n-# Requestor: <@${interaction.user.id}>`,
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
                  custom_id: "rps_rock",
                  style: 2,
                  label: "Rock",
                  emoji: { name: "🪨" },
                },
                {
                  type: 2,
                  custom_id: "rps_paper",
                  style: 2,
                  label: "Paper",
                  emoji: { name: "📄" },
                },
                {
                  type: 2,
                  custom_id: "rps_scissors",
                  style: 2,
                  label: "Scissors",
                  emoji: { name: "✂️" },
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await sendAndFetchReply(
      interaction,
      pvpStartContainerPayload,
    );

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 86400000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id && i.user.id !== opponent.id) {
        return i.reply({
          content: "You are not part of this match!",
          ephemeral: true,
        });
      }

      const choice = i.customId.replace("rps_", "");
      playerChoices[i.user.id] = choice;

      await i.reply({
        content: `You picked ${CHOICES[choice].emoji} **${CHOICES[choice].name}**! Waiting for opponent...`,
        ephemeral: true,
      });

      const p1Choice = playerChoices[interaction.user.id]
        ? "<:Picked:1542151058929746090> Picked"
        : "<:Timer:1542147643021725796> Waiting...";
      const p2Choice = playerChoices[opponent.id]
        ? "<:Picked:1542151058929746090> Picked"
        : "<:Timer:1542147643021725796> Waiting...";

      const updatedContainer = {
        content: getPvpContent(),
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: getRandomColor(),
            components: [
              {
                type: 10,
                content: "### <:RPS:1545074718174875718> ROCK, PAPER, SCISSORS",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: `**${userDisplayName}**: ${p1Choice}\n**${opponentDisplayName}**: ${p2Choice}\n\n-# Requestor: <@${interaction.user.id}>`,
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
                    custom_id: "rps_rock",
                    style: 2,
                    label: "Rock",
                    emoji: { name: "🪨" },
                  },
                  {
                    type: 2,
                    custom_id: "rps_paper",
                    style: 2,
                    label: "Paper",
                    emoji: { name: "📄" },
                  },
                  {
                    type: 2,
                    custom_id: "rps_scissors",
                    style: 2,
                    label: "Scissors",
                    emoji: { name: "✂️" },
                  },
                ],
              },
            ],
          },
        ],
      };

      await response.edit(updatedContainer).catch(() => null);

      if (playerChoices[interaction.user.id] && playerChoices[opponent.id]) {
        collector.stop("both_played");
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "both_played") {
        const c1 = playerChoices[interaction.user.id];
        const c2 = playerChoices[opponent.id];

        let resultMsg = "";

        if (c1 === c2) {
          resultMsg = `🤝 **It's a tie!** Both players picked ${CHOICES[c1].emoji} **${CHOICES[c1].name}**.`;
        } else if (CHOICES[c1].beats === c2) {
          resultMsg = `<a:Tada:1544329561955770488> **${userDisplayName} wins!**\n${CHOICES[c1].emoji} **${CHOICES[c1].name}** beats ${CHOICES[c2].emoji} **${CHOICES[c2].name}**.`;
        } else {
          resultMsg = `<a:Tada:1544329561955770488> **${opponentDisplayName} wins!**\n${CHOICES[c2].emoji} **${CHOICES[c2].name}** beats ${CHOICES[c1].emoji} **${CHOICES[c1].name}**.`;
        }

        const pvpContainerPayload = {
          content: null,
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: getRandomColor(),
              components: [
                {
                  type: 10,
                  content: "### 🪨📄✂️ MATCH RESULTS",
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: `${resultMsg}\n\n-# Requestor: <@${interaction.user.id}>`,
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
                      custom_id: "rps_play_again",
                      style: 1,
                      label: "Play Again",
                    },
                  ],
                },
              ],
            },
          ],
        };

        await response.edit(pvpContainerPayload).catch(() => null);

        const pvpPlayAgainCollector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 86400000,
        });

        pvpPlayAgainCollector.on("collect", async (paInteraction) => {
          if (paInteraction.customId === "rps_play_again") {
            if (
              paInteraction.user.id !== interaction.user.id &&
              paInteraction.user.id !== opponent.id
            ) {
              return paInteraction.reply({
                content: "You were not part of this game!",
                ephemeral: true,
              });
            }
            pvpPlayAgainCollector.stop("restarted");

            const newOpponent =
              paInteraction.user.id === interaction.user.id
                ? opponent
                : interaction.user;

            return startGame(paInteraction, client, newOpponent);
          }
        });
      } else {
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
                  content:
                    "### <:Timer:1542147643021725796> Match Timed Out\n\nOne or both players failed to make a move in time!",
                },
              ],
            },
          ],
        };

        await response.edit(timeoutContainer).catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in RPS command handler:", err);
    Sentry.captureException(err);
  }
}
