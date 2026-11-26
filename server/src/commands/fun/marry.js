import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, marryUsers } from "../../services/database.js";

export const data = {
  name: "marry",
  description: "Marry another user.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to marry.",
      type: 6,
      required: true,
    },
  ],
};

function buildCard(content, accentColor = 0xff70a6, buttons = []) {
  const containerComponents = [
    {
      type: 10,
      content,
    },
  ];

  if (buttons.length > 0) {
    containerComponents.push({
      type: 14,
      divider: true,
      spacing: 1,
    });
    containerComponents.push({
      type: 1,
      components: buttons,
    });
  }

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: containerComponents,
      },
    ],
  };
}

export async function execute(interaction, client) {
  try {
    const author = interaction.user || interaction.author;
    const serverId = interaction.guild?.id;

    if (!serverId) {
      const payload = buildCard(
        "This command can only be used inside a server!",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const targetUser =
      interaction.options?.getUser("user") ||
      interaction.mentions?.users?.first();

    if (!targetUser) {
      const payload = buildCard(
        "Please mention or select a user to propose to!",
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.id === author.id) {
      const payload = buildCard(
        "You cannot marry yourself, narcissist! 💀",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.bot) {
      const payload = buildCard(
        "You cannot marry a bot! Robots don't date humans.",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const authorFam = await getUserFamily(serverId, author.id);
    if (authorFam.partnerId) {
      const payload = buildCard(
        `You are already married to <@${authorFam.partnerId}>! Divorce them first with \`/divorce\`. 💔`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const targetFam = await getUserFamily(serverId, targetUser.id);
    if (targetFam.partnerId) {
      const payload = buildCard(
        `<@${targetUser.id}> is already married to <@${targetFam.partnerId}>! Respect their vows. 💍`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (authorFam.childrenIds.includes(targetUser.id)) {
      const payload = buildCard(
        "You cannot marry your own child! 🤢",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (authorFam.parentIds.includes(targetUser.id)) {
      const payload = buildCard(
        "You cannot marry your own parent! 💀",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const proposalContent = `### 💍 Marriage Proposal\n\n<@${targetUser.id}>, **<@${author.id}>** has gotten down on one knee and proposed to you!\n\nDo you take them as your partner?`;
    const buttons = [
      {
        type: 2,
        style: 3,
        custom_id: "marry_accept",
        label: "I Do! 💖",
      },
      {
        type: 2,
        style: 4,
        custom_id: "marry_decline",
        label: "Reject 💔",
      },
    ];

    const payload = buildCard(proposalContent, 0xff70a6, buttons);

    let replyMsg;
    if (interaction.reply) {
      const resp = await interaction.reply({
        ...payload,
        withResponse: true,
      });
      replyMsg = resp.resource?.message || (await interaction.fetchReply?.());
    } else {
      replyMsg = await interaction.message?.reply(payload);
    }

    if (!replyMsg) return;

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (btnInt) => {
      if (btnInt.user.id !== targetUser.id) {
        return btnInt.reply({
          content: "This proposal isn't for you!",
          ephemeral: true,
        });
      }

      await btnInt.deferUpdate().catch(() => null);

      if (btnInt.customId === "marry_accept") {
        await marryUsers(serverId, author.id, targetUser.id);
        const successPayload = buildCard(
          `### 🥂 Just Married!\n\nRing the wedding bells! <@${author.id}> and <@${targetUser.id}> are now happily married!`,
          0x2ecc71,
        );
        await replyMsg.edit(successPayload).catch(() => null);
        collector.stop("accepted");
      } else {
        const rejectPayload = buildCard(
          `### 💔 Proposal Rejected!\n\nOuch... <@${targetUser.id}> left <@${author.id}> standing at the altar with a shattered heart.`,
          0xed4245,
        );
        await replyMsg.edit(rejectPayload).catch(() => null);
        collector.stop("declined");
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        const timeoutPayload = buildCard(
          `### ⏱️ Proposal Expired\n\n<@${targetUser.id}> took too long to answer. <@${author.id}> walked away in awkward silence.`,
          0x7f8c8d,
        );
        await replyMsg.edit(timeoutPayload).catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in Marry command execution:", err);
    Sentry.captureException(err);
  }
}
