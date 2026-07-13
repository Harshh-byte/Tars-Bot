import { Events } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";

export const name = Events.InteractionCreate;

export async function execute(interaction, client, context) {
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
    await command.execute(interaction, client, context);
  } catch (err) {
    logger.error(`Error executing /${interaction.commandName}`, err);

    Sentry.captureException(err);

    const payload = {
      content: "An unexpected error occurred while executing this command.",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}
