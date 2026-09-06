import {
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { deleteUserData, deleteServerData } from "../../services/database.js";
import {
  successEmbed,
  warningEmbed,
  errorEmbed,
  EMBED_COLORS,
} from "../../utils/embeds.js";
import logger from "../../utils/logger.js";

export const aliases = ["erase"];

export const data = {
  name: "purge",
  description: "Delete stored bot memory for a user or server.",
  dm_permission: false,
  default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  options: [
    {
      type: 1,
      name: "user",
      description: "Delete a user's memory.",
      options: [
        {
          name: "user",
          description: "User to purge.",
          type: 6,
          required: true,
        },
      ],
    },
    {
      type: 1,
      name: "server",
      description: "Delete server memory.",
    },
  ],
};

async function sendResponse(interaction, payload, fallbackPayload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply(payload);
  } catch (err) {
    logger.warn("V2 payload failed in purge, using fallback:", err);
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(fallbackPayload);
    }
    return await interaction.reply(fallbackPayload);
  }
}

export async function execute(interaction, client) {
  if (interaction.user.id !== process.env.OWNER_ID) {
    const accessDeniedV2 = {
      flags: MessageFlags.Ephemeral,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.ERROR || 0xef4444,
          components: [
            {
              type: 10,
              content:
                `### <:Failed:1526228290413658184> Access Denied\n` +
                `-# Only the bot owner can execute the memory purge command.`,
            },
          ],
        },
      ],
    };

    const accessDeniedV1 = {
      embeds: [
        errorEmbed({
          title: "Access Denied",
          description:
            "Only the bot owner can execute the memory purge command.",
        }),
      ],
      flags: MessageFlags.Ephemeral,
    };

    return sendResponse(interaction, accessDeniedV2, accessDeniedV1);
  }

  let subcommand = null;
  let targetUser = null;

  if (typeof interaction.options?.getUser === "function") {
    targetUser = interaction.options.getUser("user");
  }

  if (!targetUser && interaction.mentions?.users?.size > 0) {
    targetUser = interaction.mentions.users.first();
  }

  if (typeof interaction.options?.getSubcommand === "function") {
    try {
      subcommand = interaction.options.getSubcommand(false);
    } catch {}
  }

  if (targetUser || subcommand === "user") {
    if (targetUser) {
      return handlePurgeUser(interaction, targetUser);
    }
  }

  return handlePurgeServer(interaction);
}

async function handlePurgeUser(interaction, targetUser) {
  const guildId = interaction.guild?.id || interaction.guildId;
  try {
    await deleteUserData(guildId, targetUser.id);

    const successV2 = {
      flags: MessageFlags.Ephemeral,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.SUCCESS || 0x22c55e,
          components: [
            {
              type: 10,
              content:
                `### <:Check:1526228234851450910> Memory Purged\n` +
                `Successfully erased all stored memory for **${targetUser.tag}**.\n\n` +
                `• **Deleted Data:** Conversation history, saved profile, AI memory\n` +
                `• **Requested By:** <@${interaction.user.id}>\n` +
                `• **Target User:** <@${targetUser.id}>`,
            },
          ],
        },
      ],
    };

    const successV1 = {
      embeds: [
        successEmbed({
          title: "Memory Purged",
          description: `Successfully erased all stored memory for **${targetUser.tag}**.`,
          fields: [
            {
              name: "Deleted Data",
              value:
                "• Conversation history\n• Saved profile\n• AI context & memory",
            },
            {
              name: "Requested By",
              value: `<@${interaction.user.id}>`,
              inline: true,
            },
            { name: "User", value: `<@${targetUser.id}>`, inline: true },
          ],
        }),
      ],
      flags: MessageFlags.Ephemeral,
    };

    return sendResponse(interaction, successV2, successV1);
  } catch (error) {
    logger.error("Error purging user data:", error);
    const errorV2 = {
      flags: MessageFlags.Ephemeral,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.ERROR || 0xef4444,
          components: [
            {
              type: 10,
              content:
                `### <:Failed:1526228290413658184> Purge Failed\n` +
                `-# Couldn't delete stored memory for <@${targetUser.id}>. Please try again later.`,
            },
          ],
        },
      ],
    };

    const errorV1 = {
      embeds: [
        errorEmbed({
          title: "Purge Failed",
          description:
            "I couldn't delete this user's stored memory. Please try again later.",
        }),
      ],
      flags: MessageFlags.Ephemeral,
    };

    return sendResponse(interaction, errorV2, errorV1);
  }
}

async function handlePurgeServer(interaction) {
  const guildName = interaction.guild?.name || "this server";

  const confirmV2 = {
    flags: MessageFlags.Ephemeral,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.WARNING || 0xf59e0b,
        components: [
          {
            type: 10,
            content:
              `### ⚠️ Delete Server Memory?\n` +
              `This will permanently delete **every stored memory and setting** for **${guildName}**.\n\n` +
              `-# ⚠️ This action is irreversible.`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: "purge_confirm",
                style: 4,
                label: "Delete",
                emoji: { id: "1526228290413658184", name: "Delete" },
              },
              {
                type: 2,
                custom_id: "purge_cancel",
                style: 2,
                label: "Cancel",
              },
            ],
          },
        ],
      },
    ],
  };

  const confirmV1 = {
    embeds: [
      warningEmbed({
        title: "Delete Server Memory?",
        description:
          "This will permanently delete every stored memory for this server. This action cannot be undone.",
      }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("purge_confirm")
          .setLabel("Delete")
          .setEmoji("1526228290413658184")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("purge_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };

  const response = await sendResponse(interaction, confirmV2, confirmV1);
  if (!response) return;

  try {
    const button = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    if (button.customId === "purge_cancel") {
      const cancelV2 = {
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.WARNING || 0xf59e0b,
            components: [
              {
                type: 10,
                content:
                  `### 🛑 Purge Cancelled\n` +
                  `-# Server memory purge operation has been cancelled safely.`,
              },
            ],
          },
        ],
      };

      const cancelV1 = {
        embeds: [
          warningEmbed({
            title: "Cancelled",
            description: "The server memory purge has been cancelled.",
          }),
        ],
        components: [],
      };

      try {
        return await button.update(cancelV2);
      } catch {
        return await button.update(cancelV1);
      }
    }

    await deleteServerData(interaction.guild.id);

    const successV2 = {
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.SUCCESS || 0x22c55e,
          components: [
            {
              type: 10,
              content:
                `### <:Check:1526228234851450910> Server Memory Purged\n` +
                `Successfully deleted all stored memory for **${guildName}**.\n\n` +
                `• **Deleted Data:** All conversation history, member profiles, AI memory, server settings\n` +
                `• **Requested By:** <@${interaction.user.id}>`,
            },
          ],
        },
      ],
    };

    const successV1 = {
      embeds: [
        successEmbed({
          title: "Server Memory Purged",
          description: `Successfully deleted all stored memory for **${guildName}**.`,
          fields: [
            {
              name: "Deleted Data",
              value:
                "• All conversation history\n• All member profiles\n• AI memory\n• Server settings",
            },
            {
              name: "Requested By",
              value: `<@${interaction.user.id}>`,
              inline: true,
            },
          ],
        }),
      ],
      components: [],
    };

    try {
      return await button.update(successV2);
    } catch {
      return await button.update(successV1);
    }
  } catch {
    const timeoutV2 = {
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.WARNING || 0xf59e0b,
          components: [
            {
              type: 10,
              content:
                `### ⏱️ Confirmation Expired\n` +
                `-# No response was received within 30 seconds. Purge operation cancelled.`,
            },
          ],
        },
      ],
    };

    const timeoutV1 = {
      embeds: [
        warningEmbed({
          title: "Confirmation Expired",
          description:
            "No response was received within 30 seconds. The purge operation has been cancelled.",
        }),
      ],
      components: [],
    };

    try {
      return await interaction.editReply(timeoutV2);
    } catch {
      return await interaction.editReply(timeoutV1);
    }
  }
}
