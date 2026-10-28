import { Events, EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";

export const name = Events.GuildMemberAdd;

export async function execute(member, client) {
  try {
    if (member.user.bot) return;

    const targetGuildId = process.env.WELCOME_GUILD_ID;
    if (!targetGuildId || member.guild.id !== targetGuildId) {
      return;
    }

    const messageContent = `Look who decided to show up <@${member.id}>.`;

    const guildIcon = member.guild.iconURL({ dynamic: true, size: 256 });
    const userAvatar = member.user.displayAvatarURL({
      dynamic: true,
      size: 256,
    });
    const memberCount = member.guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor("#7583ff")
      .setAuthor({
        name: member.guild.name,
        iconURL: guildIcon || undefined,
      })
      .setThumbnail(userAvatar)
      .setDescription(
        `Thanks for joining **${targetGuild?.name}**!\n\n` +
          `*Don't be a stranger, hop into chat before we assume you're an NPC!* <a:paimon_cookie:1167491163142500472>\n\n` +
          `-# Member #${memberCount} • Welcome!`,
      );

    await member.send({
      content: messageContent,
      embeds: [embed],
    });
  } catch (error) {
    if (error.code === 50007) {
      logger.warn(
        `Could not send welcome DM to ${member.user?.tag || member.id}: DMs are closed or user blocked DMs.`,
      );
    } else {
      logger.error(
        `Failed to send welcome DM to ${member.user?.tag || member.id}:`,
        error,
      );
    }
  }
}
