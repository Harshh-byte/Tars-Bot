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
  accessDeniedEmbed,
  EMBED_COLORS,
} from "../../utils/embeds.js";
import logger from "../../utils/logger.js";

export const data = {
  name: "erase",
  description: "Erase stored bot memory.",
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
          description: "User to erase.",
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

async function sendResponse(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return await interaction.editReply(payload);
  }
  return await interaction.reply(payload);
}

export async function execute(interaction, client) {
  if (interaction.user.id !== process.env.OWNER_ID) {
    const accessDeniedPayload = {
      embeds: [accessDeniedEmbed()],
      flags: MessageFlags.Ephemeral,
    };

    return sendResponse(interaction, accessDeniedPayload, accessDeniedPayload);
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
      return handleEraseUser(interaction, targetUser);
    }
  }

  return handleEraseServer(interaction);
}

async function handleEraseUser(interaction, targetUser) {
  const guildId = interaction.guild?.id || interaction.guildId;
  try {
    await deleteUserData(guildId, targetUser.id);

    const successV2 = {
      flags: MessageFlags.Ephemeral,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.SUCCESS,
          components: [
            {
              type: 10,
              content:
                `### <:Check:1526228234851450910> Memory Erased\n` +
                `Successfully erased all stored memory for **${targetUser.tag}**.\n\n` +
                `• **Deleted Data:** Conversation history, saved profile, Memory\n` +
                `• **Requested By:** <@${interaction.user.id}>\n` +
                `• **Target User:** <@${targetUser.id}>`,
            },
          ],
        },
      ],
    };

    return sendResponse(interaction, successV2);
  } catch (error) {
    logger.error("Error erasing user data:", error);
    const errorPayload = {
      flags: MessageFlags.Ephemeral,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.ERROR,
          components: [
            {
              type: 10,
              content:
                `### <:Failed:1526228290413658184> Erase Failed\n` +
                `-# Couldn't delete stored memory for <@${targetUser.id}>. Please try again later.`,
            },
          ],
        },
      ],
    };

    return sendResponse(interaction, errorPayload);
  }
}

async function handleEraseServer(interaction) {
  const guildName = interaction.guild?.name;

  const confirmPayload = {
    flags: MessageFlags.Ephemeral,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.WARNING,
        components: [
          {
            type: 10,
            content:
              `### ⚠️ Delete Server Memory?\n` +
              `This will permanently erase **every stored memory and setting** for **${guildName}**.\n\n` +
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
                custom_id: "erase_confirm",
                style: 4,
                label: "Delete",
                emoji: { id: "1526228290413658184", name: "Delete" },
              },
              {
                type: 2,
                custom_id: "erase_cancel",
                style: 2,
                label: "Cancel",
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await sendResponse(interaction, confirmPayload);
  if (!response) return;

  try {
    const button = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    if (button.customId === "erase_cancel") {
      const cancelPayload = {
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.WARNING,
            components: [
              {
                type: 10,
                content:
                  `### 🛑 Erase Cancelled\n` +
                  `-# Server memory erase operation has been cancelled safely.`,
              },
            ],
          },
        ],
      };

      return await button.update(cancelPayload);
    }

    await deleteServerData(interaction.guild.id);

    const successPayload = {
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.SUCCESS,
          components: [
            {
              type: 10,
              content:
                `### <:Check:1526228234851450910> Server Memory Erased\n` +
                `Successfully deleted all stored memory for **${guildName}**.\n\n` +
                `• **Deleted Data:** All conversation history, member profiles, Memory, server settings\n` +
                `• **Requested By:** <@${interaction.user.id}>`,
            },
          ],
        },
      ],
    };

    return await button.update(successPayload);
  } catch {
    const timeoutPayload = {
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.WARNING,
          components: [
            {
              type: 10,
              content:
                `### ⏱️ Confirmation Expired\n` +
                `-# No response was received within 30 seconds. Erase operation cancelled.`,
            },
          ],
        },
      ],
    };

    return await interaction.editReply(timeoutPayload);
  }
}
