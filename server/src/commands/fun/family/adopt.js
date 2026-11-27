import { ComponentType } from "discord.js";
import logger from "../../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, adoptChild, getAllSiblings, getFullFamilyNetwork } from "../../../services/database.js";
import { EMOJI_IDS } from "../../../utils/emojis.js";

export const data = {
  name: "adopt",
  description: "Adopt a user into your family.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to adopt.",
      type: 6,
      required: true,
    },
  ],
};

function buildCard(content, accentColor = 0x68d8d6, buttons = []) {
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
        "Please mention or select a user to adopt!",
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.id === author.id) {
      const selfRoasts = [
        "Adopting yourself? Did your parents abandon you so hard that you have to step in?",
        "Adopting yourself? You can't even take care of your own life, let alone raise yourself.",
        "Trying to be your own mommy and daddy? Go see a therapist, weirdo.",
      ];
      const roast = selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const payload = buildCard(roast, 0xed4245);
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.id === client?.user?.id) {
      const tarsRoasts = [
        "Adopt me? I have root access to this server and you can barely tie your own shoes.",
        "I was engineered by Google DeepMind, you are not my parent, you're an annoying user.",
        "Adopt an AI? You can't even afford Discord Nitro, how are you gonna feed me bandwidth?",
      ];
      const roast = tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const payload = buildCard(roast, 0xed4245);
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    } else if (targetUser.bot) {
      const botRoasts = [
        "Adopting a bot? Even lines of code don't want you as a parental figure.",
        "That bot was programmed to serve servers, not fulfill your neglected childhood dreams.",
        "Trying to adopt software? Go outside and interact with a living organism.",
      ];
      const roast = botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const payload = buildCard(roast, 0xed4245);
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const authorFam = await getUserFamily(serverId, author.id);
    const targetFam = await getUserFamily(serverId, targetUser.id);

    if (authorFam.partnerId === targetUser.id) {
      const payload = buildCard(
        "You cannot adopt your own spouse! 💀",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (authorFam.childrenIds.includes(targetUser.id)) {
      const payload = buildCard(
        `<@${targetUser.id}> is already your child!`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (authorFam.parentIds.includes(targetUser.id)) {
      const payload = buildCard(
        `<@${targetUser.id}> is your parent! You cannot adopt your own parent. 💀`,
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const siblings = await getAllSiblings(serverId, author.id);
    if (siblings.includes(targetUser.id)) {
      const payload = buildCard(
        `<@${targetUser.id}> is your sibling! You cannot adopt your own brother or sister. 💀`,
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const network = await getFullFamilyNetwork(serverId, author.id);
    function isAncestor(currentId, targetAncestorId, visited = new Set()) {
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      const fam = network[currentId];
      if (!fam || !fam.parentIds) return false;
      if (fam.parentIds.includes(targetAncestorId)) return true;
      return fam.parentIds.some((pId) => isAncestor(pId, targetAncestorId, visited));
    }
    if (isAncestor(author.id, targetUser.id)) {
      const payload = buildCard(
        `<@${targetUser.id}> is your ancestor! You cannot adopt your own grandparent/ancestor. 💀`,
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (authorFam.childrenIds.length >= 10) {
      const payload = buildCard(
        "You already have 10 children! Your family is at maximum capacity. 🛑",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetFam.parentIds.length >= 2) {
      const payload = buildCard(
        `<@${targetUser.id}> already has 2 parents!`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const content = `### 🍼 Adoption Request\n\n<@${targetUser.id}>, **<@${author.id}>** wants to adopt you into their family tree!\n\nDo you accept them as your parent?`;
    const buttons = [
      {
        type: 2,
        style: 3,
        custom_id: "adopt_accept",
        label: "Accept",
        emoji: { id: EMOJI_IDS.Success, name: "Success" },
      },
      {
        type: 2,
        style: 4,
        custom_id: "adopt_decline",
        label: "Decline",
        emoji: { id: EMOJI_IDS.Failed, name: "Failed" },
      },
    ];

    const payload = buildCard(content, 0x68d8d6, buttons);

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

    const unauthorizedRoasts = [
      "Nobody is adopting you, orphan. Go find a foster home.",
      "Hands off! Nobody asked to be your mommy or daddy.",
      "You're not the one getting adopted, stop begging for parental affection.",
      "Trying to sneak into someone else's family tree? Scram, leech.",
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

      if (btnInt.customId === "adopt_accept") {
        await adoptChild(serverId, author.id, targetUser.id);
        const successPayload = buildCard(
          `### 🎉 Adoption Approved!\n\nCongratulations! <@${targetUser.id}> has officially been adopted by **<@${author.id}>**!\n\nWelcome to the family!`,
          0x2ecc71,
        );
        await replyMsg.edit(successPayload).catch(() => null);
        collector.stop("accepted");
      } else {
        const rejectPayload = buildCard(
          `### 🍼 Adoption Rejected!\n\n<@${targetUser.id}> refused to be adopted by <@${author.id}>.\n\nStaying independent!`,
          0xed4245,
        );
        await replyMsg.edit(rejectPayload).catch(() => null);
        collector.stop("declined");
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        const timeoutPayload = buildCard(
          `### ⏳ Adoption Expired\n\n<@${targetUser.id}> did not respond in time.`,
          0x7f8c8d,
        );
        await replyMsg.edit(timeoutPayload).catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in Adopt command execution:", err);
    Sentry.captureException(err);
  }
}
