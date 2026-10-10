import { Events, ChannelType, PermissionFlagsBits } from "discord.js";
import { createWelcomePayload } from "../utils/welcomeMessage.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";

export const name = Events.GuildCreate;

export async function execute(guild, client) {
  try {
    let targetChannel = null;

    if (guild.systemChannelId) {
      const systemChan = guild.channels.cache.get(guild.systemChannelId);
      if (
        systemChan &&
        systemChan.type === ChannelType.GuildText &&
        guild.members.me
          .permissionsIn(systemChan)
          .has(PermissionFlagsBits.SendMessages)
      ) {
        targetChannel = systemChan;
      }
    }

    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          guild.members.me
            .permissionsIn(channel)
            .has(PermissionFlagsBits.SendMessages),
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
        const ownerCard = {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0xffffff,
              components: [
                {
                  type: 10,
                  content:
                    `### <a:Entry:1558429545479016468> **New Server Joined!**\n` +
                    `**Server:** ${guild.name}\n` +
                    `**Members:** \`${memberCount.toLocaleString()}\`\n` +
                    `-# **${botName}** was successfully added to ${guild.name}.`,
                },
              ],
            },
          ],
        };
        await owner.send(ownerCard).catch(() => null);
      } catch (err) {
        logger.warn("Could not send join notification to bot owner DM:", err);
      }
    }
  } catch (err) {
    logger.error(`Error in GuildCreate event for ${guild.id}:`, err);
    Sentry.captureException(err);
  }
}
