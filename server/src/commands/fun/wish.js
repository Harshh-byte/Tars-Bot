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
      description: "Event name (birthday, anniversary, congrats etc.).",
      type: 3,
      required: false,
    },
  ],
};

export async function execute(interaction, client, { buildAiReply }) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const event = interaction.options.getString("event") || "this occasion";
  const isSelf = targetUser.id === interaction.user.id;

  try {
    await interaction.deferReply();

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    const replyData = await buildAiReply({
      authorId: interaction.user.id,
      inputText: `Wish <@${targetUser.id}> for ${event}`,
      mode: "wish",
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
