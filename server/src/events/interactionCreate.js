import { Events } from "discord.js";
import logger from "../logger.js";
import * as Sentry from "@sentry/node";

export const name = Events.InteractionCreate;

export async function execute(interaction, client, { buildAiReply, BOT_INFO }) {
  if (!interaction.isChatInputCommand()) return;

  const musicCommands = ["play", "skip", "volume", "stop"];
  if (musicCommands.includes(interaction.commandName)) {
    return interaction.reply({
      content: `🎵 The \`/${interaction.commandName}\` feature is currently under maintenance.`,
      ephemeral: true,
    });
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    if (interaction.commandName === "ping") {
      const getUptimeString = () => {
        let totalSeconds = Math.floor(client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      };
      await command.execute(interaction, client, getUptimeString);
    } else if (interaction.commandName === "about") {
      await command.execute(interaction, client, BOT_INFO);
    } else if (
      interaction.commandName === "roast" ||
      interaction.commandName === "wish"
    ) {
      await command.execute(interaction, client, { buildAiReply, BOT_INFO });
    }
  } catch (err) {
    logger.error(`Error executing command ${interaction.commandName}:`, err);
    Sentry.captureException(err);
    if (interaction.deferred || interaction.replied) {
      await interaction
        .followUp({
          content: "An error occurred executing this command.",
          ephemeral: true,
        })
        .catch(() => null);
    } else {
      await interaction
        .reply({
          content: "An error occurred executing this command.",
          ephemeral: true,
        })
        .catch(() => null);
    }
  }
}
