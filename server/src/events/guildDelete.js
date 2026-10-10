import { Events, AuditLogEvent, EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { deleteServerData } from "../services/database.js";
import { EMOJIS } from "../utils/emojis.js";

export const name = Events.GuildDelete;

export async function execute(guild, client) {
  try {
    const botName = client.user?.displayName || client.user?.username;
    const isServerDeleted = guild.available === false;
    let titleText = isServerDeleted ? "Server Deleted" : "Server Removed";
    let detailText = isServerDeleted
      ? `${guild.name} was deleted or became unavailable.`
      : `${botName} was removed from ${guild.name}.`;
    let kickedByText = "";

    if (!isServerDeleted) {
      try {
        if (guild.members?.me?.permissions?.has("ViewAuditLog")) {
          const fetchedLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberKick,
          }).catch(() => null);

          const kickEntry = fetchedLogs?.entries?.first();
          if (kickEntry && kickEntry.target?.id === client.user.id) {
            const executor = kickEntry.executor;
            const reason = kickEntry.reason ? ` (Reason: "${kickEntry.reason}")` : "";
            if (executor) {
              titleText = "Kicked from Server";
              kickedByText = `\n**Kicked By:** ${executor.tag || executor.username}${reason}`;
            }
          }
        }
      } catch (e) {}
    }

    if (guild.id) {
      deleteServerData(guild.id).catch((err) => {
        logger.warn(`Failed to clean up database for server ${guild.id}:`, err);
      });
    }

    if (process.env.OWNER_ID) {
      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const memberCount = guild.memberCount || 0;
        const ownerEmbed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`${EMOJIS.Exit} **${titleText}**`)
          .setDescription(
            `**Server:** ${guild.name}\n` +
            `**Members:** \`${memberCount.toLocaleString()}\`${kickedByText}\n\n` +
            `-# ${detailText}`,
          );
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

