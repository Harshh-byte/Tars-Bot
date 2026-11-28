import { Events } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { removeUserFromFamily } from "../services/database.js";

export const name = Events.GuildMemberRemove;

export async function execute(member, client) {
  try {
    if (!member || !member.guild || !member.id) return;
    if (member.user?.bot) return;

    await removeUserFromFamily(member.guild.id, member.id);
    logger.info(`Cleaned up family relationships for member ${member.user?.tag || member.id} who left guild ${member.guild.id}.`);
  } catch (error) {
    logger.error(`Error handling guildMemberRemove for ${member?.id}:`, error);
    Sentry.captureException(error);
  }
}
