import { MessageFlags } from "discord.js";
import {
  parseReminderInput,
  saveAndScheduleReminder,
} from "../../services/reminder.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import logger from "../../utils/logger.js";

export const aliases = ["timer"];

export const data = {
  name: "remind",
  description: "Set a smart reminder.",
  dm_permission: false,
  options: [
    {
      name: "task",
      description: "Reminder details.",
      type: 3,
      required: true,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    let inputText =
      interaction.options?.getString?.("task") ||
      interaction.options?.getString?.() ||
      "";

    if (!inputText && interaction.message?.content) {
      const parts = interaction.message.content.trim().split(/ +/);
      inputText = parts.slice(1).join(" ");
    }

    if (!inputText || inputText.trim() === "") {
      const usagePayloadV2 = {
        flags: MessageFlags.Ephemeral,
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.ERROR || 0xef4444,
            components: [
              {
                type: 10,
                content:
                  `### <:Failed:1526228290413658184> Missing Reminder Details\n` +
                  `Please specify a time and task for the reminder.`,
              },
            ],
          },
        ],
      };

      return interaction.reply(usagePayloadV2);
    }

    if (typeof interaction.deferReply === "function") {
      await interaction.deferReply().catch(() => null);
    }

    const parsed = await parseReminderInput(inputText);

    if (!parsed || !parsed.delayMs || parsed.delayMs <= 0) {
      const invalidV2 = {
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.ERROR || 0xef4444,
            components: [
              {
                type: 10,
                content:
                  `### <:Failed:1526228290413658184> Could Not Parse Time\n` +
                  `I couldn't figure out the timeframe from \`${inputText}\`.\n\n` +
                  `Try specifying a duration like \`in 2 hours\`, \`30 mins\`, or \`10m\`.`,
              },
            ],
          },
        ],
      };

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(invalidV2);
      }
      return interaction.reply(invalidV2);
    }

    const triggerAt = Date.now() + parsed.delayMs;
    const unixSeconds = Math.floor(triggerAt / 1000);

    const reminderData = {
      userId: interaction.user.id,
      guildId: interaction.guild?.id || "DM",
      guildName: interaction.guild?.name || "Direct Messages",
      channelId: interaction.channelId || interaction.channel?.id,
      task: parsed.task,
      triggerAt,
      createdAt: Date.now(),
    };

    await saveAndScheduleReminder(client, reminderData);

    const triggerDate = new Date(triggerAt);
    const dayDateString = triggerDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const confirmV2 = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.WHITE || 0xffffff,
          components: [
            {
              type: 10,
              content:
                `### <:Timer:1542147643021725796> Reminder Scheduled\n` +
                `> **${parsed.task}**`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content:
                `• **Trigger Time:** ${dayDateString} (<t:${unixSeconds}:R>)\n\n` +
                `-# *I'll send you a DM notification as soon as the timer ends.*`,
            },
          ],
        },
      ],
    };

    const confirmV1 = {
      content: `<:Timer:1542147643021725796> **Reminder Scheduled:** **${parsed.task}** <t:${unixSeconds}:R> (via DM)`,
    };

    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(confirmV2);
      }
      return await interaction.reply(confirmV2);
    } catch {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(confirmV1);
      }
      return await interaction.reply(confirmV1);
    }
  } catch (err) {
    logger.error("Error in remind command handler:", err);
  }
}
