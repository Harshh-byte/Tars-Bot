import { Events, EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { checkCooldown } from "../utils/cooldowns.js";
import { errorEmbed } from "../utils/embeds.js";
import { EMOJIS } from "../utils/emojis.js";

export const name = Events.InteractionCreate;

function getFormattedMaintenanceTime(startTime) {
  const date = startTime ? new Date(startTime) : new Date();
  const timeStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `Today at ${timeStr}`;
}

export async function execute(interaction, client, context) {
  const EXEMPT_GUILD_ID = process.env.EXEMPT_GUILD_ID;
  if (
    client.maintenanceMode &&
    interaction.guild?.id !== EXEMPT_GUILD_ID &&
    interaction.user.id !== process.env.OWNER_ID
  ) {
    const maintenanceEmbed = new EmbedBuilder()
      .setColor(0xffa502)
      .setTitle(`${EMOJIS.Updates} **System Maintenance**`)
      .setDescription(
        `${client.user.displayName} is currently undergoing scheduled maintenance and will be back online shortly.`,
      )
      .setFooter({
        text: getFormattedMaintenanceTime(client.maintenanceStartTime),
      });

    if (interaction.deferred || interaction.replied) {
      return interaction
        .followUp({
          embeds: [maintenanceEmbed],
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
    }
    return interaction
      .reply({
        embeds: [maintenanceEmbed],
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => null);
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  const cooldown = checkCooldown(
    interaction.user.id,
    interaction.commandName,
    command.cooldown || 3,
  );

  if (cooldown.onCooldown) {
    const userAvatar = interaction.user.displayAvatarURL({ dynamic: true });
    const cooldownEmbed = errorEmbed({
      author: {
        name: interaction.member?.displayName || interaction.user.username,
        iconURL: userAvatar,
      },
      description: `${EMOJIS.Timer} You can use \`/${interaction.commandName}\` again <t:${cooldown.expirationTimestamp}:R>.`,
    });

    return interaction.reply({
      embeds: [cooldownEmbed],
      flags: MessageFlags.Ephemeral,
    });
  }

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
