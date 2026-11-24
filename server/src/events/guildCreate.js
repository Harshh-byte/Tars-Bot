import { Events, ChannelType, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { createWelcomePayload } from "../utils/welcomeMessage.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMOJIS } from "../utils/emojis.js";

export const name = Events.GuildCreate;

export async function execute(guild, client) {
  try {
    let targetChannel = null;

    if (guild.systemChannelId && guild.channels?.cache) {
      const systemChan = guild.channels.cache.get(guild.systemChannelId);
      if (
        systemChan &&
        systemChan.type === ChannelType.GuildText &&
        guild.members?.me
          ?.permissionsIn(systemChan)
          ?.has(PermissionFlagsBits.SendMessages)
      ) {
        targetChannel = systemChan;
      }
    }

    if (!targetChannel && guild.channels?.cache) {
      targetChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          guild.members?.me
            ?.permissionsIn(channel)
            ?.has(PermissionFlagsBits.SendMessages),
      );
    }

    if (targetChannel) {
      const payload = createWelcomePayload(guild, client);
      await targetChannel.send(payload).catch((err) => {
        logger.error(
          `Could not send welcome payload to channel ${targetChannel.id}:`,
          err,
        );
      });
    }

    const botName =
      client.user?.displayName || client.user?.username;

    if (process.env.OWNER_ID) {
      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const memberCount = guild.memberCount || 0;
        const guildIcon = guild.iconURL({ dynamic: true, size: 256 });
        const guildOwner = await guild.fetchOwner().catch(() => null);
        const totalGuilds = client.guilds.cache.size;

        const ownerName = guildOwner?.user?.tag || guildOwner?.user?.username || "Unknown";

        const ownerEmbed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle(`${EMOJIS.Enter} Joined a Server!`)
          .setDescription(
            `### ${guild.name}\n\n` +
            `> • **Members:** \`${memberCount.toLocaleString()}\`\n` +
            `> • **Owner:** \`${ownerName}\`\n` +
            `> • **Servers:** \`${totalGuilds}\``,
          )
          .setFooter({ text: `Server #${totalGuilds} • ID: ${guild.id}` });

        if (guildIcon) {
          ownerEmbed.setThumbnail(guildIcon);
        }

        await owner.send({ embeds: [ownerEmbed] }).catch((err) => {
          logger.warn("Failed to send join DM to owner:", err);
        });
      } catch (err) {
        logger.warn("Could not send join notification to bot owner DM:", err);
      }
    }
  } catch (err) {
    logger.error(`Error in GuildCreate event for ${guild.id}:`, err);
    Sentry.captureException(err);
  }
}
