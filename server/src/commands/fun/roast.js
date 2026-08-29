import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const data = {
  name: "roast",
  description: "Roast a user.",
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

export async function execute(interaction, client, { buildAiReply }) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const isSelf = targetUser.id === interaction.user.id;

  if (targetUser.id === client.user.id) {
    return interaction.reply(
      "My sarcasm setting is at 100%. You don't want this smoke.",
    );
  }

  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => null);
    }

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    const targetName = targetUser.displayName || targetUser.username;
    const roastPrompt = isSelf
      ? "Roast me with maximum savage brutality. No holding back, no polite filler—hit me with a clever, ruthless, and devastating roast."
      : `Roast @${targetName} (<@${targetUser.id}>) with maximum savage brutality. No holding back, no polite filler—hit them with a clever, ruthless, and devastating roast.`;

    const replyData = await buildAiReply({
      authorId: interaction.user.id,
      inputText: roastPrompt,
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
