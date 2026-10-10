import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS, errorEmbed } from "../../utils/embeds.js";
import { EMOJIS } from "../../utils/emojis.js";

export const aliases = ["ui", "whois", "user"];

export const data = {
  name: "userinfo",
  description: "Gets information about a user.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "The user to get information about.",
      type: 6,
      required: false,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    let targetUser = null;
    let rawInput = null;

    if (typeof interaction.options?.getUser === "function") {
      try {
        targetUser = interaction.options.getUser("user");
      } catch (_) {}
    }
    if (typeof interaction.options?.getString === "function") {
      try {
        rawInput = interaction.options.getString("user");
      } catch (_) {}
    }

    if (!targetUser && rawInput) {
      const idMatch = rawInput.match(/\d{17,20}/)?.[0];
      if (idMatch) {
        targetUser = await client.users.fetch(idMatch).catch(() => null);
      }
      if (!targetUser) {
        const errEmbed = errorEmbed({
          title: "User Not Found",
          description: `>>> There's no user called \`${rawInput.trim()}\``,
        });
        return interaction.reply({ embeds: [errEmbed] });
      }
    }

    if (!targetUser) {
      targetUser = interaction.user;
    }

    const fetchedUser = await client.users
      .fetch(targetUser.id, { force: true })
      .catch(() => targetUser);

    let member = interaction.guild?.members?.cache.get(targetUser.id);
    if (!member && interaction.guild) {
      member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
    }

    const createdTimestamp = Math.floor(fetchedUser.createdTimestamp / 1000);
    const avatarUrl = fetchedUser.displayAvatarURL({ size: 4096 });

    const avatarDecoUrl = fetchedUser.avatarDecorationURL({ size: 4096 });
    const bannerUrl = fetchedUser.bannerURL({ size: 4096 });

    let generalText = `> **User:** @${fetchedUser.username}\n`;
    generalText += `> **ID:** \`${fetchedUser.id}\`\n`;
    generalText += `> **Mention:** <@${fetchedUser.id}>\n`;
    generalText += `> **Created:** <t:${createdTimestamp}:R>\n`;

    if (fetchedUser.hexAccentColor) {
      generalText += `> **Banner color:** \`${fetchedUser.hexAccentColor}\`\n`;
    }

    if (fetchedUser.avatar) {
      generalText += `> [**Avatar**](${avatarUrl})\n`;
    }
    if (avatarDecoUrl) {
      generalText += `> [**Avatar decoration**](${avatarDecoUrl})\n`;
    }
    if (bannerUrl) {
      generalText += `> [**Banner**](${bannerUrl})\n`;
    }

    let serverText = "";
    if (member) {
      const joinedTimestamp = member.joinedTimestamp
        ? Math.floor(member.joinedTimestamp / 1000)
        : null;
      if (joinedTimestamp) {
        serverText += `> **Joined:** <t:${joinedTimestamp}:R>\n`;
      }
      if (member.nickname) {
        serverText += `> **Nickname:** ${member.nickname}\n`;
      }

      const highestRole = member.roles.highest;
      if (highestRole && highestRole.id !== interaction.guild.id) {
        serverText += `> **Role:** ${highestRole.toString()}\n`;
      } else {
        serverText += `> **Role:** None\n`;
      }

      const keyPerms = [];
      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        keyPerms.push("Administrator");
      } else {
        if (member.permissions.has(PermissionFlagsBits.ManageGuild))
          keyPerms.push("Manage Server");
        if (member.permissions.has(PermissionFlagsBits.ManageRoles))
          keyPerms.push("Manage Roles");
        if (member.permissions.has(PermissionFlagsBits.ManageChannels))
          keyPerms.push("Manage Channels");
        if (member.permissions.has(PermissionFlagsBits.KickMembers))
          keyPerms.push("Kick Members");
        if (member.permissions.has(PermissionFlagsBits.BanMembers))
          keyPerms.push("Ban Members");
        if (member.permissions.has(PermissionFlagsBits.ManageMessages))
          keyPerms.push("Manage Messages");
        if (member.permissions.has(PermissionFlagsBits.ManageWebhooks))
          keyPerms.push("Manage Webhooks");
        if (member.permissions.has(PermissionFlagsBits.ManageNicknames))
          keyPerms.push("Manage Nicknames");
        if (member.permissions.has(PermissionFlagsBits.MentionEveryone))
          keyPerms.push("Mention Everyone");
        if (member.permissions.has(PermissionFlagsBits.ModerateMembers))
          keyPerms.push("Timeout Members");
      }

      if (keyPerms.length > 0) {
        serverText += `> **Key Permissions:** ${keyPerms.map((p) => `\`${p}\``).join(", ")}\n`;
      }
    } else if (interaction.guild) {
      serverText = `> User is not a member of this server.\n`;
    }

    const allRoles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => `> \`-\` ${r.toString()}`)
      : [];

    const ROLES_PER_PAGE = 15;
    const totalPages = Math.ceil(allRoles.length / ROLES_PER_PAGE);
    let currentPage = 0;

    const buildEmbed = (page) => {
      const embed = new EmbedBuilder()
        .setTitle("User Information")
        .setThumbnail(avatarUrl)
        .setColor(
          member?.displayColor || fetchedUser.accentColor || EMBED_COLORS.WHITE,
        );

      embed.addFields({ name: "General", value: generalText });

      if (serverText) {
        embed.addFields({ name: "Server", value: serverText });
      }

      const startIndex = page * ROLES_PER_PAGE;
      const pageRoles = allRoles.slice(startIndex, startIndex + ROLES_PER_PAGE);

      if (pageRoles.length > 0) {
        embed.addFields({ name: "Roles", value: pageRoles.join("\n") });
      } else if (member) {
        embed.addFields({ name: "Roles", value: "> - None" });
      }

      if (totalPages > 1) {
        embed.setFooter({ text: `Page ${page + 1}/${totalPages}` });
      }

      return embed;
    };

    const buildButtons = (page) => {
      if (totalPages <= 1) return [];

      const prevBtn = new ButtonBuilder()
        .setCustomId("userinfo_prev")
        .setEmoji(EMOJIS.Left)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

      const nextBtn = new ButtonBuilder()
        .setCustomId("userinfo_next")
        .setEmoji(EMOJIS.Right)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1);

      return [new ActionRowBuilder().addComponents(prevBtn, nextBtn)];
    };

    const initialPayload = {
      embeds: [buildEmbed(currentPage)],
      components: buildButtons(currentPage),
    };

    await interaction.reply(initialPayload);
    const response = await interaction.fetchReply();

    if (totalPages > 1 && response) {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
      });

      collector.on("collect", async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
          return btnInteraction.reply({
            content: "You cannot control this menu.",
            ephemeral: true,
          });
        }

        if (btnInteraction.customId === "userinfo_prev") {
          currentPage = Math.max(0, currentPage - 1);
        } else if (btnInteraction.customId === "userinfo_next") {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }

        await btnInteraction.update({
          embeds: [buildEmbed(currentPage)],
          components: buildButtons(currentPage),
        });
      });
    }
  } catch (err) {
    logger.error("Error in UserInfo command handler:", err);
    Sentry.captureException(err);
  }
}
