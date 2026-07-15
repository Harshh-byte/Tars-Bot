import { Events, MessageFlags, EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";

export const name = Events.InteractionCreate;

function getFormattedDateTime() {
  const now = new Date();
  const options = { timeZone: "Asia/Kolkata" };
  const localDate = new Date(now.toLocaleString("en-US", options));
  const day = localDate.getDate();
  const month = localDate.getMonth() + 1;
  const year = String(localDate.getFullYear()).slice(-2);
  const dateStr = `${day}/${month}/${year}`;

  const timeStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  return `${dateStr} • ${timeStr}`;
}

export async function execute(interaction, client, context) {
  if (!interaction.isChatInputCommand()) return;

  if (client.maintenanceMode && interaction.user.id !== process.env.OWNER_ID) {
    const maintenanceEmbed = new EmbedBuilder()
      .setColor(0xffa502)
      .setTitle("<:Updates:1526472917964030053> **System Maintenance**")
      .setDescription(
        "Tars is currently undergoing scheduled maintenance and will be back online shortly.",
      )
      .setFooter({ text: getFormattedDateTime() });

    return interaction.reply({
      embeds: [maintenanceEmbed],
      flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}
