import { Events, EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { deleteServerData } from "../services/database.js";
import { EMOJIS } from "../utils/emojis.js";

export const name = Events.GuildDelete;

export async function execute(guild, client) {
  try {
    const isServerDeleted = guild.available === false;
    const titleText = isServerDeleted ? "Server Deleted" : "Server Left / Removed";

    if (guild.id) {
      deleteServerData(guild.id).catch((err) => {
        logger.warn(`Failed to clean up database for server ${guild.id}:`, err);
      });
    }

    if (process.env.OWNER_ID) {
      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const memberCount = guild.memberCount || 0;
        const guildIcon = guild.iconURL?.({ dynamic: true, size: 256 }) || null;
        const guildOwner = await guild.fetchOwner?.().catch(() => null);
        const totalGuilds = client.guilds.cache.size;

        const ownerName = guildOwner?.user?.tag || guildOwner?.user?.username || "Unknown";

        const ownerEmbed = new EmbedBuilder()
          .setColor("#ed4245")
          .setTitle(`${EMOJIS.Exit} ${titleText}`)
          .setDescription(
            `### ${guild.name}\n\n` +
            `> • **Members:** \`${memberCount.toLocaleString()}\`\n` +
            `> • **Owner:** \`${ownerName}\`\n` +
            `> • **Servers:** \`${totalGuilds}\``,
          )
          .setFooter({ text: `${totalGuilds} Servers Remaining • ID: ${guild.id}` });

        if (guildIcon) {
          ownerEmbed.setThumbnail(guildIcon);
        }

        await owner.send({ embeds: [ownerEmbed] }).catch((err) => {
          logger.warn("Failed to send leave DM to owner:", err);
        });
      } catch (err) {
        logger.warn("Could not send leave notification to bot owner DM:", err);
      }
    }
  } catch (err) {
    logger.error(`Error in GuildDelete event for ${guild?.id}:`, err);
    Sentry.captureException(err);
  }
}

