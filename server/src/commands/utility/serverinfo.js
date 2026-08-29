import { EmbedBuilder } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS, errorEmbed } from "../../utils/embeds.js";

export const aliases = ["si", "server", "guildinfo"];

export const data = {
  name: "serverinfo",
  description: "Gets information about the server.",
  dm_permission: false,
};

export async function execute(interaction, client) {
  try {
    const guild = interaction.guild;

    if (!guild) {
      const errEmbed = errorEmbed({
        title: "Command Failed",
        description: "This command can only be used inside a server.",
      });
      return interaction.reply({ embeds: [errEmbed] });
    }

    await guild.fetch().catch(() => null);

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
    const iconUrl = guild.iconURL({ size: 4096 });
    const bannerUrl = guild.bannerURL({ size: 4096 });
    const splashUrl = guild.splashURL({ size: 4096 });

    const owner = await guild.fetchOwner().catch(() => null);
    const ownerDisplay = owner ? `${owner.user.username} (<@${guild.ownerId}>)` : `<@${guild.ownerId}>`;

    let generalText = `> **Server Name:** ${guild.name}\n`;
    generalText += `> **Server ID:** \`${guild.id}\`\n`;
    generalText += `> **Owner:** ${ownerDisplay}\n`;
    generalText += `> **Created:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n`;

    if (iconUrl) {
      generalText += `> [**Icon**](${iconUrl})\n`;
    }
    if (bannerUrl) {
      generalText += `> [**Banner**](${bannerUrl})\n`;
    }
    if (splashUrl) {
      generalText += `> [**Splash**](${splashUrl})\n`;
    }

    let statsText = `> **Members:** \`${guild.memberCount}\`\n`;
    statsText += `> **Roles:** \`${guild.roles.cache.size}\`\n`;
    statsText += `> **Channels:** \`${guild.channels.cache.size}\`\n`;
    statsText += `> **Emojis:** \`${guild.emojis.cache.size}\`\n`;

    let boostText = `> **Boost Level:** \`Level ${guild.premiumTier}\`\n`;
    boostText += `> **Boost Count:** \`${guild.premiumSubscriptionCount || 0}\` boosts\n`;

    const embed = new EmbedBuilder()
      .setTitle("Server Information")
      .setColor(EMBED_COLORS.WHITE)
      .addFields(
        { name: "General", value: generalText },
        { name: "Statistics", value: statsText },
        { name: "Boost Status", value: boostText },
      );

    if (iconUrl) {
      embed.setThumbnail(iconUrl);
    }
    if (bannerUrl) {
      embed.setImage(bannerUrl);
    }

    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error("Error in ServerInfo command handler:", err);
    Sentry.captureException(err);
  }
}
