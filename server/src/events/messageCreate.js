import { Events } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";

export const name = Events.MessageCreate;

export async function execute(message, client, { buildAiReply }) {
  if (message.author.bot) return;

  if (client.maintenanceMode && message.author.id !== process.env.OWNER_ID) return;

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

  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (command) {
      const targetUser = message.mentions.users.first() || null;
      
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
          getUser: (name) => (name === "opponent" || name === "user" ? targetUser : null),
          getString: () => args.join(" ") || null,
        },
        deferReply: async () => {
          mockInteraction.deferred = true;
          await message.channel.sendTyping().catch(() => null);
        },
        reply: async (payload) => {
          mockInteraction.replied = true;
          return message.channel.send(payload);
        },
        followUp: async (payload) => {
          return message.channel.send(payload);
        },
        editReply: async (payload) => {
          mockInteraction.replied = true;
          return message.channel.send(payload);
        },
        deleteReply: async () => {},
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
