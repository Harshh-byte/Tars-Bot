import { resolveEmoji } from "../tars.js";
import { getConversation, saveConversation } from "../database.js";
import { tarsSystemPrompt } from "../config.js";
import logger from "../logger.js";
import * as Sentry from "@sentry/node";

export const data = {
  name: "roast",
  description: "Roast yourself or a user.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to roast.",
      type: 6,
      required: false,
    },
  ],
};

export async function execute(interaction, client, { buildAiReply, BOT_INFO }) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const isSelf = targetUser.id === interaction.user.id;

  if (targetUser.id === client.user.id) {
    return interaction.reply(
      "My sarcasm setting is at 100%. You don't want this smoke.",
    );
  }

  try {
    await interaction.deferReply();

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    const replyData = await buildAiReply({
      authorId: interaction.user.id,
      inputText: isSelf ? "Roast me." : `Roast <@${targetUser.id}>`,
      mode: "roast",
      authorMember: interaction.member,
      targetMember: targetMember,
      guild: interaction.guild,
    });

    const payload = {};
    if (replyData.text && replyData.text.trim() !== "") {
      payload.content = isSelf
        ? replyData.text
        : `<@${targetUser.id}> ${replyData.text}`;
    }
    if (replyData.gifUrl) {
      payload.files = [{ attachment: replyData.gifUrl, name: "tars.gif" }];
    }

    if (!payload.content && !payload.files) {
      payload.content = "․";
    }

    if (replyData.reactions && replyData.reactions.length > 0) {
      for (const emoji of replyData.reactions) {
        const resolved = resolveEmoji(emoji, interaction.guild);
        if (resolved) {
          const channel = interaction.channel;
          if (channel) {
            const lastMessages = await channel.messages
              .fetch({ limit: 1 })
              .catch(() => null);
            const userMsg = lastMessages?.first();
            if (userMsg && userMsg.author.id === interaction.user.id) {
              await userMsg.react(resolved).catch(() => null);
            }
          }
        }
      }
    }

    await interaction.editReply(payload);
  } catch (err) {
    logger.error("Error in Roast command execution handler:", err);
    Sentry.captureException(err);
    await interaction
      .followUp({
        content: "Something went wrong while processing the roast. Try again!",
        ephemeral: true,
      })
      .catch(() => null);
  }
}
