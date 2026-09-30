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
  description: "Set a reminder.",
  dm_permission: false,
  options: [
    {
      name: "about",
      description: "About what?",
      type: 3,
      required: true,
    },
    {
      name: "when",
      description: "When to remind?",
      type: 3,
      required: true,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    const aboutArg = interaction.options?.getString?.("about");
    const whenArg = interaction.options?.getString?.("when");

    let inputText = "";

    if (aboutArg && whenArg) {
      inputText = `${aboutArg} in ${whenArg}`;
    } else if (aboutArg) {
      inputText = aboutArg;
    } else if (interaction.options?.getString?.()) {
      inputText = interaction.options.getString();
    }

    if (!inputText && interaction.message?.content) {
      const parts = interaction.message.content.trim().split(/ +/);
      inputText = parts.slice(1).join(" ");
    }

    if (!inputText || inputText.trim() === "") {
      const usagePayload = {
        flags: MessageFlags.Ephemeral,
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.ERROR,
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

      return interaction.reply(usagePayload);
    }

    if (typeof interaction.deferReply === "function") {
      await interaction.deferReply().catch(() => null);
    }

    const parsed = await parseReminderInput(inputText);

    if (!parsed || !parsed.delayMs || parsed.delayMs <= 0) {
      const invalidPayload = {
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.ERROR,
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
        return interaction.editReply(invalidPayload);
      }
      return interaction.reply(invalidPayload);
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

    const payload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.WHITE,
          components: [
            {
              type: 10,
              content:
                `### <:Timer:1554945799308443748> Reminder Scheduled\n` +
                `\`-\` **${parsed.task}**`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: `• I'll remind you in <t:${unixSeconds}:R>`,
            },
          ],
        },
      ],
    };

    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply(payload);
  } catch (err) {
    logger.error("Error in remind command handler:", err);
  }
}
