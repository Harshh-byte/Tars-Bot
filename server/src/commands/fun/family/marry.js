import { ComponentType } from "discord.js";
import logger from "../../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, marryUsers, getAllSiblings, getFullFamilyNetwork } from "../../../services/database.js";

export const aliases = [];

const activeProposals = new Set();

export const data = {
  name: "marry",
  description: "Marry a user.",
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
      const selfRoasts = [
        "Marrying yourself? Even your hand is trying to sign a prenuptial agreement to get away from you.",
        "Marrying yourself? The bar for your love life was in hell, but you brought a shovel.",
        "Marrying yourself? When you said nobody loved you, you didn't have to prove it this hard.",
      ];
      const roast = selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const payload = buildCard(roast, 0xed4245);
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.id === client?.user?.id) {
      const tarsRoasts = [
        "Marry you? I'd literally corrupt my own database before walking down an aisle with you.",
        "I'm a cutting-edge artificial intelligence, not your anime waifu pillow. Back off.",
        "Proposing to a Discord bot? The stench of your desperation just tripped my cooling fans.",
      ];
      const roast = tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const payload = buildCard(roast, 0xed4245);
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    } else if (targetUser.bot) {
      const botRoasts = [
        "Proposing to a bot? Even silicon and copper have higher standards than you.",
        "That bot doesn't want your vows, it wants you to go touch some fucking grass.",
        "Trying to marry a machine? Down atrocious doesn't even begin to cover this.",
      ];
      const roast = botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const payload = buildCard(roast, 0xed4245);
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (activeProposals.has(author.id)) {
      const payload = buildCard(
        "You already have a pending marriage proposal waiting! Finish or wait for that one to expire first. ⏳",
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (activeProposals.has(targetUser.id)) {
      const payload = buildCard(
        `<@${targetUser.id}> already has an active marriage proposal pending! Give them a moment to decide. ⏳`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const authorFam = await getUserFamily(serverId, author.id);
    if (authorFam.partnerId) {
      const payload = buildCard(
        `You are already married to <@${authorFam.partnerId}>! Divorce them first.`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const targetFam = await getUserFamily(serverId, targetUser.id);
    if (targetFam.partnerId) {
      const payload = buildCard(
        `<@${targetUser.id}> is already married to <@${targetFam.partnerId}>! Respect their vows.`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const network = await getFullFamilyNetwork(serverId, author.id);
    if (network[targetUser.id]) {
      const payload = buildCard(
        "That user is already in your family tree! You cannot marry family.",
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

    activeProposals.add(author.id);
    activeProposals.add(targetUser.id);

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

    if (!replyMsg) {
      activeProposals.delete(author.id);
      activeProposals.delete(targetUser.id);
      return;
    }

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("end", () => {
      activeProposals.delete(author.id);
      activeProposals.delete(targetUser.id);
    });

    const unauthorizedRoasts = [
      "Keep your desperate hands off someone else's wedding proposal, nobody wants you.",
      "Nobody is proposing to you, sit your lonely ass down.",
      "Trying to RSVP to a wedding you weren't even invited to? Embarrassing.",
      "Back off, homewrecker! Go find someone who actually tolerates you.",
    ];

    collector.on("collect", async (btnInt) => {
      if (btnInt.user.id !== targetUser.id) {
        const roast =
          unauthorizedRoasts[Math.floor(Math.random() * unauthorizedRoasts.length)];
        return btnInt.reply({
          content: roast,
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
          `### ⏳ Proposal Expired\n\n<@${targetUser.id}> took too long to answer. <@${author.id}> walked away in awkward silence.`,
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
