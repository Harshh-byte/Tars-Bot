import { Events, AuditLogEvent } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";

export const name = Events.GuildDelete;

export async function execute(guild, client) {
  try {
    const botName = client.user?.displayName || client.user?.username || "Tars";
    let kickedByText = "";

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
            kickedByText = `\n**Kicked By:** ${executor.tag || executor.username}${reason}`;
          }
        }
      }
    } catch (e) {}

    if (process.env.OWNER_ID) {
      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const memberCount = guild.memberCount || 0;
        const ownerCard = {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0xed4245,
              components: [
                {
                  type: 10,
                  content:
                    `### <:Exit:1558429586881118218> **Server Removed / Left**\n` +
                    `**Server:** ${guild.name}\n` +
                    `**Members:** \`${memberCount.toLocaleString()}\`${kickedByText}\n` +
                    `-# **${botName}** was removed from or left ${guild.name}.`,
                },
              ],
            },
          ],
        };
        await owner.send(ownerCard).catch(() => null);
      } catch (err) {
        logger.warn("Could not send leave notification to bot owner DM:", err);
      }
    }
  } catch (err) {
    logger.error(`Error in GuildDelete event for ${guild?.id}:`, err);
    Sentry.captureException(err);
  }
}
