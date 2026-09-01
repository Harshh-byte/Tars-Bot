import { Events, EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { checkCooldown } from "../utils/cooldowns.js";
import { errorEmbed } from "../utils/embeds.js";

export const name = Events.MessageCreate;

function getFormattedMaintenanceTime(startTime) {
  const date = startTime ? new Date(startTime) : new Date();
  const timeStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `Today at ${timeStr}`;
}

export async function execute(message, client, { buildAiReply }) {
  if (message.author.bot) return;

  if (!client.prefixCache) client.prefixCache = new Map();
  const serverId = message.guild?.id || "DM";

  if (message.guild && !client.prefixCache.has(serverId)) {
    try {
      const { getServerSettings } = await import("../services/database.js");
      const settings = await getServerSettings(serverId).catch(() => ({}));
      client.prefixCache.set(serverId, settings.prefix || ".");
    } catch {
      client.prefixCache.set(serverId, ".");
    }
  }

  const PREFIX = client.prefixCache.get(serverId) || ".";

  const isMentioned = message.mentions.has(client.user);
  let isReplyToBot = false;

  if (message.reference?.messageId) {
    try {
      const original = await message.fetchReference();
      isReplyToBot = original?.author?.id === client.user.id;
    } catch {
      isReplyToBot = false;
    }
  }

  const EXEMPT_GUILD_ID = process.env.EXEMPT_GUILD_ID;
  if (
    client.maintenanceMode &&
    message.guild?.id !== EXEMPT_GUILD_ID &&
    message.author.id !== process.env.OWNER_ID
  ) {
    if (message.content.startsWith(PREFIX) || isMentioned || isReplyToBot) {
      const maintenanceEmbed = new EmbedBuilder()
        .setColor(0xffa502)
        .setTitle("<:Updates:1526472917964030053> **System Maintenance**")
        .setDescription(
          "Tars is currently undergoing scheduled maintenance and will be back online shortly."
        )
        .setFooter({ text: getFormattedMaintenanceTime(client.maintenanceStartTime) });

      await message.reply({ embeds: [maintenanceEmbed] }).catch(() => null);
    }
    return;
  }

  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (command) {
      const cooldown = checkCooldown(
        message.author.id,
        command.data.name,
        command.cooldown || 3,
      );

      if (cooldown.onCooldown) {
        const userAvatar = message.author.displayAvatarURL({ dynamic: true });
        const cooldownEmbed = errorEmbed({
          author: {
            name: message.member?.displayName || message.author.username,
            iconURL: userAvatar,
          },
          description: `<:Timer:1542147643021725796> You can use \`${PREFIX}${commandName}\` again <t:${cooldown.expirationTimestamp}:R>.`,
        });

        await message.reply({ embeds: [cooldownEmbed] }).catch(() => null);
        return;
      }
      let targetUser =
        message.mentions.users.find((u) => message.content.includes(u.id)) ||
        null;

      if (!targetUser && args.length > 0) {
        const idMatch = args.join(" ").match(/\d{17,20}/)?.[0];
        if (idMatch) {
          targetUser = await client.users.fetch(idMatch).catch(() => null);
        }
      }

      let sentMessage = null;
      const mockInteraction = {
        commandName: commandName,
        user: message.author,
        member: message.member,
        guild: message.guild,
        channel: message.channel,
        isButton: () => false,
        isStringSelectMenu: () => false,
        replied: false,
        deferred: false,
        options: {
          getUser: (name) => {
            const mentions = Array.from(message.mentions.users.values());
            if (name === "user" || name === "user1") {
              return mentions[0] || null;
            }
            if (name === "target" || name === "user2") {
              return mentions[1] || null;
            }
            return name === "opponent" ? targetUser : null;
          },
          getString: () => args.join(" ") || null,
        },
        deferReply: async () => {
          mockInteraction.deferred = true;
          await message.channel.sendTyping().catch(() => null);
        },
        reply: async (payload) => {
          mockInteraction.replied = true;
          sentMessage = await message.channel.send(payload);
          return sentMessage;
        },
        followUp: async (payload) => {
          if (sentMessage) {
            return sentMessage.edit(payload);
          }
          sentMessage = await message.channel.send(payload);
          return sentMessage;
        },
        editReply: async (payload) => {
          mockInteraction.replied = true;
          if (sentMessage) {
            return sentMessage.edit(payload);
          }
          sentMessage = await message.channel.send(payload);
          return sentMessage;
        },
        deleteReply: async () => {
          if (sentMessage) await sentMessage.delete().catch(() => null);
        },
      };

      try {
        await command.execute(mockInteraction, client, { buildAiReply });
      } catch (err) {
        logger.error(`Error executing prefix command .${commandName}:`, err);
        Sentry.captureException(err);
      }
      return;
    }
  }

  if (!isMentioned && !isReplyToBot) return;

  try {
    const replyData = await buildAiReply({
      authorId: message.author.id,
      inputText: message.content,
      mode: "normal",
      authorMember: message.member,
      guild: message.guild,
    });

    if ((replyData.text && replyData.text.trim() !== "") || replyData.gifUrl) {
      await message.channel.sendTyping();

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (replyData.reactions && replyData.reactions.length > 0) {
      for (const emoji of replyData.reactions) {
        const resolved = client.resolveEmoji(emoji);
        if (resolved) {
          await message.react(resolved).catch(() => null);
        }
      }
    }

    const messagePayload = {};

    if (replyData.text && replyData.text.trim() !== "") {
      messagePayload.content = replyData.text;
    }

    if (replyData.gifUrl) {
      messagePayload.files = [
        {
          attachment: replyData.gifUrl,
          name: "tars.gif",
        },
      ];
    }

    if (messagePayload.content || messagePayload.files) {
      await message.reply(messagePayload);
    }
  } catch (err) {
    logger.error("Error in MessageCreate event handler execution:", err);
    Sentry.captureException(err);
  }
}
