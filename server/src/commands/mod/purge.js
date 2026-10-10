import { PermissionFlagsBits, MessageFlags, EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { EMOJIS } from "../../utils/emojis.js";
import logger from "../../utils/logger.js";

export const data = {
  name: "purge",
  description: "Purge messages from the current channel.",
  dm_permission: false,
  default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  options: [
    {
      type: 1,
      name: "any",
      description: "Purge any messages from the channel.",
      options: [
        {
          name: "count",
          description: "Number of messages to delete (up to 100).",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 100,
        },
      ],
    },
    {
      type: 1,
      name: "user",
      description: "Purge messages from a specific user.",
      options: [
        {
          name: "user",
          description: "Target user whose messages should be deleted.",
          type: 6,
          required: true,
        },
        {
          name: "count",
          description: "Number of messages (up to 100).",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 100,
        },
      ],
    },
    {
      type: 1,
      name: "bots",
      description: "Delete messages sent by bots.",
      options: [
        {
          name: "count",
          description: "Number of messages (up to 100).",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 100,
        },
      ],
    },
  ],
};

async function sendResponse(interaction, payload, autoDeleteMs = 0) {
  try {
    let sent = null;
    if (interaction.deferred || interaction.replied) {
      sent = await interaction.editReply(payload);
    } else if (typeof interaction.reply === "function") {
      sent = await interaction.reply(payload);
    } else if (interaction.channel?.send) {
      sent = await interaction.channel.send(payload);
    }

    if (autoDeleteMs > 0 && sent && typeof sent.delete === "function") {
      setTimeout(() => sent.delete().catch(() => {}), autoDeleteMs);
    }
    return sent;
  } catch (err) {
    logger.warn("Payload failed in purge, trying channel.send fallback:", err);
    try {
      let sent = null;
      if (interaction.channel?.send) {
        sent = await interaction.channel.send(payload);
      }
      if (autoDeleteMs > 0 && sent && typeof sent.delete === "function") {
        setTimeout(() => sent.delete().catch(() => {}), autoDeleteMs);
      }
      return sent;
    } catch {}
  }
}

export async function execute(interaction, client) {
  const memberPermissions = interaction.member?.permissions;
  const isOwner = interaction.user.id === process.env.OWNER_ID;
  const isSlash =
    typeof interaction.isChatInputCommand === "function" &&
    interaction.isChatInputCommand();

  if (
    !isOwner &&
    memberPermissions &&
    !memberPermissions.has(PermissionFlagsBits.ManageMessages) &&
    !memberPermissions.has(PermissionFlagsBits.Administrator)
  ) {
    const deniedEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setDescription(
        "You need the `Manage Messages` permission to use this command.",
      );

    return sendResponse(
      interaction,
      { embeds: [deniedEmbed], flags: MessageFlags.Ephemeral },
      5000,
    );
  }

  const botMember = interaction.guild?.members?.me;
  if (botMember && interaction.channel.permissionsFor) {
    const perms = interaction.channel.permissionsFor(botMember);
    const missing = [];
    if (!perms.has(PermissionFlagsBits.ViewChannel))
      missing.push("`View Channel`");
    if (!perms.has(PermissionFlagsBits.ManageMessages))
      missing.push("`Manage Messages`");
    if (!perms.has(PermissionFlagsBits.ReadMessageHistory))
      missing.push("`Read Message History`");

    if (missing.length > 0) {
      const botDeniedEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setDescription(
          `${EMOJIS.Failed} I don't have permission to purge messages in ${interaction.channel}! Missing permissions: ${missing.join(", ")}.`,
        );

      return sendResponse(
        interaction,
        { embeds: [botDeniedEmbed], flags: MessageFlags.Ephemeral },
        5000,
      );
    }
  }

  let count = null;
  let targetUser = null;
  let filterType = "any";

  const triggerMsg =
    interaction.message || (interaction.content ? interaction : null);

  if (isSlash) {
    if (typeof interaction.options?.getSubcommand === "function") {
      try {
        const sub = interaction.options.getSubcommand(false);
        if (sub) filterType = sub;
      } catch {}
    }

    if (typeof interaction.options?.getInteger === "function") {
      const rawCount = interaction.options.getInteger("count");
      if (rawCount) count = rawCount;
    }

    if (typeof interaction.options?.getUser === "function") {
      targetUser = interaction.options.getUser("user");
    }
  } else {
    const rawContent = triggerMsg?.content || interaction.content || "";
    const args = rawContent.trim().split(/\s+/).slice(1);

    if (interaction.mentions?.users?.size > 0) {
      targetUser = interaction.mentions.users.first();
      filterType = "user";
    }

    for (const arg of args) {
      const parsedNum = parseInt(arg, 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        count = Math.min(parsedNum, 100);
      } else if (["bot", "bots"].includes(arg.toLowerCase())) {
        filterType = "bot";
      } else if (["user", "users"].includes(arg.toLowerCase())) {
        filterType = "user";
      } else if (["any", "all"].includes(arg.toLowerCase())) {
        filterType = "any";
      }
    }
  }

  if (!count || count < 1) {
    if (!isSlash && triggerMsg && typeof triggerMsg.delete === "function") {
      triggerMsg.delete().catch(() => {});
    }

    const missingCountEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.WARNING)
      .setDescription(
        `${EMOJIS.Warning} Please specify the number of messages to purge.`,
      );

    return sendResponse(
      interaction,
      { embeds: [missingCountEmbed], flags: MessageFlags.Ephemeral },
      isSlash ? 0 : 5000,
    );
  }
  count = Math.min(count, 100);

  if (targetUser && filterType === "any") {
    filterType = "user";
  }

  if (isSlash && interaction.deferReply) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch {}
  }

  try {
    let fetchLimit = count;
    if (!isSlash) {
      fetchLimit = count + 5;
    }
    if (filterType !== "any" || targetUser) {
      fetchLimit = Math.min(count * 4, 100);
    } else {
      fetchLimit = Math.min(fetchLimit, 100);
    }

    const fetched = await interaction.channel.messages.fetch({
      limit: fetchLimit,
    });

    let messagesToDelete = Array.from(fetched.values());

    const triggerId = triggerMsg?.id || interaction.id;
    if (triggerId) {
      messagesToDelete = messagesToDelete.filter((m) => m.id !== triggerId);
    }

    if (filterType === "bot" || filterType === "bots") {
      messagesToDelete = messagesToDelete.filter((m) => m.author.bot);
    } else if (filterType === "user" || targetUser) {
      if (targetUser) {
        messagesToDelete = messagesToDelete.filter(
          (m) => m.author.id === targetUser.id,
        );
      } else {
        messagesToDelete = messagesToDelete.filter((m) => !m.author.bot);
      }
    }

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messagesToDelete = messagesToDelete.filter(
      (m) => m.createdTimestamp > fourteenDaysAgo,
    );

    messagesToDelete = messagesToDelete.slice(0, count);

    if (messagesToDelete.length === 0) {
      if (!isSlash && triggerMsg && typeof triggerMsg.delete === "function") {
        triggerMsg.delete().catch(() => {});
      }

      const emptyEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.WARNING)
        .setDescription(
          `${EMOJIS.Warning} No messages found eligible for purge.`,
        );

      return sendResponse(
        interaction,
        { embeds: [emptyEmbed], flags: MessageFlags.Ephemeral },
        isSlash ? 0 : 5000,
      );
    }

    const deleted = await interaction.channel.bulkDelete(
      messagesToDelete,
      true,
    );
    const deletedCount = deleted.size;

    if (!isSlash && triggerMsg && typeof triggerMsg.delete === "function") {
      triggerMsg.delete().catch(() => {});
    }

    const successEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setDescription(
        `${EMOJIS.Success} Successfully purged **${deletedCount}** message${deletedCount === 1 ? "" : "s"}.`,
      );

    return sendResponse(
      interaction,
      { embeds: [successEmbed], flags: MessageFlags.Ephemeral },
      isSlash ? 0 : 5000,
    );
  } catch (error) {
    logger.error("Error purging messages:", error);

    if (!isSlash && triggerMsg && typeof triggerMsg.delete === "function") {
      triggerMsg.delete().catch(() => {});
    }

    const errorEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setDescription(
        `${EMOJIS.Failed} Failed to purge messages.`,
      );

    return sendResponse(
      interaction,
      { embeds: [errorEmbed], flags: MessageFlags.Ephemeral },
      isSlash ? 0 : 5000,
    );
  }
}
