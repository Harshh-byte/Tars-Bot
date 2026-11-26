import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, divorceUsers } from "../../services/database.js";
import { EMOJI_IDS } from "../../utils/emojis.js";

export const data = {
  name: "divorce",
  description: "Divorce your partner.",
  dm_permission: false,
};

function buildCard(content, accentColor = 0xed4245, buttons = []) {
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
      const payload = buildCard("This command can only be used inside a server!");
      return interaction.reply ? interaction.reply(payload) : interaction.message?.reply(payload);
    }

    const authorFam = await getUserFamily(serverId, author.id);
    if (!authorFam.partnerId) {
      const payload = buildCard("You aren't even married to anyone! 💀", 0xffa502);
      return interaction.reply ? interaction.reply(payload) : interaction.message?.reply(payload);
    }

    const partnerId = authorFam.partnerId;
    const confirmContent = `### 💔 Confirm Divorce\n\nAre you sure you want to divorce <@${partnerId}>?\n\nThis will sever your marriage vows and cannot be undone.`;
    const buttons = [
      {
        type: 2,
        style: 4,
        custom_id: "divorce_confirm",
        label: "Divorce",
        emoji: { id: EMOJI_IDS.Failed, name: "Failed" },
      },
      {
        type: 2,
        style: 2,
        custom_id: "divorce_cancel",
        label: "Cancel",
      },
    ];

    const payload = buildCard(confirmContent, 0xed4245, buttons);

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
      "Mind your own fucking business, you're not the one getting divorced.",
      "Trying to sign someone else's divorce papers? Get a life, nosy parasite.",
      "This isn't your marriage to destroy, back the fuck off.",
      "Nobody asked for your input on their relationship, butt out.",
    ];

    collector.on("collect", async (btnInt) => {
      if (btnInt.user.id !== author.id) {
        const roast =
          unauthorizedRoasts[Math.floor(Math.random() * unauthorizedRoasts.length)];
        return btnInt.reply({
          content: roast,
          ephemeral: true,
        });
      }

      await btnInt.deferUpdate().catch(() => null);

      if (btnInt.customId === "divorce_confirm") {
        await divorceUsers(serverId, author.id);
        const donePayload = buildCard(
          `### 📜 Divorce Finalized\n\n<@${author.id}> has officially filed for divorce and separated from <@${partnerId}>!`,
          0xed4245,
        );
        await replyMsg.edit(donePayload).catch(() => null);
        collector.stop("divorced");
      } else {
        const cancelPayload = buildCard(
          `### 🕊️ Divorce Cancelled\n\n<@${author.id}> decided to stay together with <@${partnerId}>.`,
          0x2ecc71,
        );
        await replyMsg.edit(cancelPayload).catch(() => null);
        collector.stop("cancelled");
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "divorced" && reason !== "cancelled") {
        const timeoutPayload = buildCard(
          "### ⏳ Divorce Expired\n\nDivorce confirmation timed out. Marriage remains intact.",
          0x7f8c8d,
        );
        await replyMsg.edit(timeoutPayload).catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in Divorce command execution:", err);
    Sentry.captureException(err);
  }
}
