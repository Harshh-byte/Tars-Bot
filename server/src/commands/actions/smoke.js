import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import {
  incrementUserStat,
  incrementGlobalUserStat,
} from "../../services/database.js";

export const aliases = ["cigar"];

export const data = {
  name: "smoke",
  description: "Take a hit of smoke.",
  dm_permission: true,
};

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const res = await interaction.reply({ ...payload, withResponse: true });
  return res?.resource?.message || res;
}

export async function execute(interaction, client) {
  try {
    const userId = interaction.user.id;
    const serverId = interaction.guild?.id || "DM";

    let count;
    if (serverId !== "DM") {
      count = await incrementUserStat(serverId, userId, "smokeCount");
      incrementGlobalUserStat(userId, "smokeCount").catch(() => null);
    } else {
      count = await incrementGlobalUserStat(userId, "smokeCount");
    }

    const getDisplayName = (targetInteraction) =>
      targetInteraction.member?.displayName ||
      targetInteraction.user.displayName ||
      targetInteraction.user.username;

    const buildPayload = (currentCount, name) => ({
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.GREY,
          components: [
            {
              type: 10,
              content: "### <a:smok:1542640291654144082> SMOKE SESSION",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: `*${name}* took a hit of smoke!\n\n-# Total Smokes: \`${currentCount}\``,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  custom_id: "smoke_again",
                  style: 2,
                  label: "Take Another Hit",
                },
              ],
            },
          ],
        },
      ],
    });

    const response = await sendAndFetchReply(
      interaction,
      buildPayload(count, getDisplayName(interaction)),
    );

    if (
      !response ||
      typeof response.createMessageComponentCollector !== "function"
    )
      return;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 86400000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== userId) {
        return i.reply({
          content: "Start your own smoke session with `/smoke`!",
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      let newCount;
      if (serverId !== "DM") {
        newCount = await incrementUserStat(serverId, userId, "smokeCount");
        incrementGlobalUserStat(userId, "smokeCount").catch(() => null);
      } else {
        newCount = await incrementGlobalUserStat(userId, "smokeCount");
      }

      await sendAndFetchReply(i, buildPayload(newCount, getDisplayName(i)));
    });
  } catch (err) {
    logger.error("Error in Smoke command handler:", err);
    Sentry.captureException(err);
  }
}
