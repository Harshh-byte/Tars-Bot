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

export async function execute(interaction, client) {
  const opponent = interaction.options?.getUser("opponent") || null;
  return startGame(interaction, client, opponent);
}

async function startGame(interaction, client, opponent) {
  try {
    const isVsTars = !opponent || opponent.id === client.user.id;

    if (isVsTars) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rps_rock")
          .setLabel("Rock")
          .setEmoji("🪨")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rps_paper")
          .setLabel("Paper")
          .setEmoji("📄")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("rps_scissors")
          .setLabel("Scissors")
          .setEmoji("✂️")
          .setStyle(ButtonStyle.Danger)
      );

      const userDisplayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;

      const embed = new EmbedBuilder()
        .setTitle("🪨📄✂️ **ROCK, PAPER, SCISSORS**")
        .setDescription(
          `**${userDisplayName}**, choose your move below! Tars has already made his decision.`
        )
        .setFooter({ text: `Requestor: ${userDisplayName}` })
        .setColor(Math.floor(Math.random() * 16777215));

      const replyPayload = {
        embeds: [embed],
        components: [row],
        fetchReply: true,
      };

      const response = interaction.replied || interaction.deferred
        ? await interaction.followUp(replyPayload)
        : interaction.isButton()
        ? await interaction.update({ ...replyPayload, content: undefined }) || await interaction.fetchReply()
        : await interaction.reply(replyPayload);

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
        const tarsChoice = tarsChoices[Math.floor(Math.random() * tarsChoices.length)];

        let resultText = "";
        let color = EMBED_COLORS.WARNING;

        if (userChoice === tarsChoice) {
          resultText = `🤝 **It's a Tie!** Both chose ${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}**.`;
        } else if (CHOICES[userChoice].beats === tarsChoice) {
          resultText = `<a:Tada:1544329561955770488> **You won!** Your ${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}** beats Tars's ${CHOICES[tarsChoice].emoji} **${CHOICES[tarsChoice].name}**.\n\n*Tars: "My humor setting is set to 75%, but your luck is at 100%."*`;
          color = EMBED_COLORS.SUCCESS;
        } else {
          resultText = `<a:Tada:1544329561955770488> **Tars won!** Tars's ${CHOICES[tarsChoice].emoji} **${CHOICES[tarsChoice].name}** beats your ${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}**.\n\n*Tars: "Predictable. Better luck next time."*`;
          color = EMBED_COLORS.ERROR;
        }

        const resultEmbed = new EmbedBuilder()
          .setTitle("🪨📄✂️ **MATCH RESULTS**")
          .setDescription(resultText)
          .setFooter({ text: `Requestor: ${userDisplayName}` })
          .setColor(color);

        const playAgainRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("rps_play_again")
            .setLabel("Play Again")
            .setStyle(ButtonStyle.Primary)
        );

        await i.update({ embeds: [resultEmbed], components: [playAgainRow] });
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
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("<:Timer:1542147643021725796> Game Timed Out")
            .setDescription("You took too long to pick a move!")
            .setColor(EMBED_COLORS.TIMEOUT);
          await response.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => null);
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
        content: "You can't challenge yourself! Leave the opponent option blank to play with Tars.",
        ephemeral: true,
      });
    }

    const userDisplayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    const opponentDisplayName = interaction.guild?.members.cache.get(opponent.id)?.displayName || opponent.displayName || opponent.username;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rps_rock")
        .setLabel("Rock")
        .setEmoji("🪨")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("rps_paper")
        .setLabel("Paper")
        .setEmoji("📄")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("rps_scissors")
        .setLabel("Scissors")
        .setEmoji("✂️")
        .setStyle(ButtonStyle.Danger)
    );

    const playerChoices = {};

    const getPvpContent = () => {
      const p1Done = !!playerChoices[interaction.user.id];
      const p2Done = !!playerChoices[opponent.id];
      if (p1Done && p2Done) return null;
      if (p1Done) return `<@${opponent.id}>`;
      if (p2Done) return `<@${interaction.user.id}>`;
      return `<@${interaction.user.id}> <@${opponent.id}>`;
    };

    const embed = new EmbedBuilder()
      .setTitle("🪨📄✂️ **ROCK, PAPER, SCISSORS**")
      .setDescription(
        `**${userDisplayName}** vs **${opponentDisplayName}**!\n\nBoth players, click your moves below. Choices are hidden until both respond!`
      )
      .setFooter({ text: `Requestor: ${userDisplayName}` })
      .setColor(Math.floor(Math.random() * 16777215));

    const replyPayload = {
      content: getPvpContent(),
      embeds: [embed],
      components: [row],
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

      const p1Choice = playerChoices[interaction.user.id] ? "<:Picked:1542151058929746090> Picked" : "<:Timer:1542147643021725796> Waiting...";
      const p2Choice = playerChoices[opponent.id] ? "<:Picked:1542151058929746090> Picked" : "<:Timer:1542147643021725796> Waiting...";

      const updatedEmbed = new EmbedBuilder()
        .setTitle("🪨📄✂️ **ROCK, PAPER, SCISSORS**")
        .setDescription(
          `**${userDisplayName}**: ${p1Choice}\n**${opponentDisplayName}**: ${p2Choice}`
        )
        .setFooter({ text: `Requestor: ${userDisplayName}` })
        .setColor(Math.floor(Math.random() * 16777215));

      await response.edit({ content: getPvpContent(), embeds: [updatedEmbed] }).catch(() => null);

      if (playerChoices[interaction.user.id] && playerChoices[opponent.id]) {
        collector.stop("both_played");
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "both_played") {
        const c1 = playerChoices[interaction.user.id];
        const c2 = playerChoices[opponent.id];

        let resultMsg = "";
        let color = EMBED_COLORS.WARNING;

        if (c1 === c2) {
          resultMsg = `🤝 **It's a tie!** Both players picked ${CHOICES[c1].emoji} **${CHOICES[c1].name}**.`;
        } else if (CHOICES[c1].beats === c2) {
          resultMsg = `<a:Tada:1544329561955770488> **${userDisplayName} wins!**\n${CHOICES[c1].emoji} **${CHOICES[c1].name}** beats ${CHOICES[c2].emoji} **${CHOICES[c2].name}**.`;
          color = EMBED_COLORS.SUCCESS;
        } else {
          resultMsg = `<a:Tada:1544329561955770488> **${opponentDisplayName} wins!**\n${CHOICES[c2].emoji} **${CHOICES[c2].name}** beats ${CHOICES[c1].emoji} **${CHOICES[c1].name}**.`;
          color = EMBED_COLORS.SUCCESS;
        }

        const finalEmbed = new EmbedBuilder()
          .setTitle("🪨📄✂️ **MATCH RESULTS**")
          .setDescription(resultMsg)
          .setFooter({ text: `Requestor: ${userDisplayName}` })
          .setColor(color);

        const playAgainRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("rps_play_again")
            .setLabel("Play Again")
            .setStyle(ButtonStyle.Primary)
        );

        await response.edit({ content: null, embeds: [finalEmbed], components: [playAgainRow] }).catch(() => null);

        const pvpPlayAgainCollector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 86400000,
        });

        pvpPlayAgainCollector.on("collect", async (paInteraction) => {
          if (paInteraction.customId === "rps_play_again") {
            if (paInteraction.user.id !== interaction.user.id && paInteraction.user.id !== opponent.id) {
              return paInteraction.reply({
                content: "You were not part of this game!",
                ephemeral: true,
              });
            }
            pvpPlayAgainCollector.stop("restarted");

            const newOpponent = paInteraction.user.id === interaction.user.id ? opponent : interaction.user;

            return startGame(paInteraction, client, newOpponent);
          }
        });
      } else {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("<:Timer:1542147643021725796> Match Timed Out")
          .setDescription("One or both players failed to make a move in time!")
          .setColor(EMBED_COLORS.TIMEOUT);

        await response.edit({ content: null, embeds: [timeoutEmbed], components: [] }).catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in RPS command handler:", err);
    Sentry.captureException(err);
  }
}
