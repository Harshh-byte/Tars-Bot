import { Events } from "discord.js";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";
import { resolveEmoji } from "../../tars.js";

export const name = Events.MessageCreate;

export async function execute(message, client, { buildAiReply }) {
  if (message.author.bot) return;

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
        const resolved = resolveEmoji(emoji, message.guild);
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
