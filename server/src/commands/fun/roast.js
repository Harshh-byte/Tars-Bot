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
    {
      name: "reason",
      description: "Specific reason for the roast.",
      type: 3,
      required: false,
    },
  ],
};

export async function execute(interaction, client, { buildAiReply }) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const reason = interaction.options.getString("reason");
  const isSelf = targetUser.id === interaction.user.id;

  const isBotTarget = targetUser.id === client.user.id;

  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply().catch(() => null);
    }

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    const targetName = targetUser.displayName || targetUser.username;

    let roastPrompt;
    if (isBotTarget) {
      roastPrompt = reason
        ? `The user <@${interaction.user.id}> tried to roast Tars with reason "${reason}". Turn the roast back on them with 100% maximum savage brutality, zero mercy, and devastating sarcasm.`
        : `The user <@${interaction.user.id}> tried to roast Tars. Turn the roast back on them with 100% maximum savage brutality, zero mercy, and devastating sarcasm.`;
    } else if (isSelf) {
      roastPrompt = reason
        ? `Roast me with maximum savage brutality. Topic/Reason: "${reason}". No holding back, no polite filler—hit me with a clever, ruthless burn.`
        : `Roast me with maximum savage brutality. No holding back, no polite filler—hit me with a clever, ruthless, and devastating roast.`;
    } else {
      roastPrompt = reason
        ? `Roast @${targetName} (<@${targetUser.id}>) with maximum savage brutality. Topic/Reason: "${reason}". No holding back, no polite filler—hit them with a clever, ruthless, and devastating burn based on this topic.`
        : `Roast @${targetName} (<@${targetUser.id}>) with maximum savage brutality. No holding back, no polite filler—hit them with a clever, ruthless, and devastating roast.`;
    }

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
