import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const data = {
  name: "wish",
  description: "Send a wish message.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to wish.",
      type: 6,
      required: false,
    },
    {
      name: "event",
      description: "Event name (default: birthday).",
      type: 3,
      required: false,
    },
  ],
};

export async function execute(interaction, client, { buildAiReply }) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const event = interaction.options.getString("event") || "birthday";
  const isBotTarget = targetUser.id === client.user.id;

  try {
    await interaction.deferReply();

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    const targetName = targetUser.displayName || targetUser.username;
    let wishPrompt;
    if (isBotTarget) {
      wishPrompt = `The user <@${interaction.user.id}> sent TARS a wish for ${event}. Respond as TARS with a smooth, charismatic, stylish, and witty appreciation message thanking <@${interaction.user.id}> while maintaining TARS's cool 100% humor personality.`;
    } else if (isSelf) {
      wishPrompt = `Give me a smooth, charismatic, premium, and deeply memorable wish for ${event}. Make it uplifting, stylish, and personal with zero toxicity or backhanded compliments.`;
    } else {
      wishPrompt = `Give @${targetName} (<@${targetUser.id}>) a smooth, charismatic, premium, and deeply memorable wish for ${event}. Make it uplifting, stylish, and personal with zero toxicity or backhanded compliments.`;
    }

    const replyData = await buildAiReply({
      authorId: interaction.user.id,
      inputText: wishPrompt,
      mode: "wish",
      authorMember: interaction.member,
      targetMember: targetMember,
      guild: interaction.guild,
    });

    const payload = {};
    if (replyData.text && replyData.text.trim() !== "") {
      payload.content =
        isSelf || isBotTarget
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
        const resolved = client.resolveEmoji(emoji);
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
    logger.error("Error in Wish command execution handler:", err);
    Sentry.captureException(err);
    await interaction
      .followUp({
        content: "Something went wrong while processing the wish. Try again!",
        ephemeral: true,
      })
      .catch(() => null);
  }
}
