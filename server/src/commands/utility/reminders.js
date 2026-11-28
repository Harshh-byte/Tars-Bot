import { ComponentType, MessageFlags } from "discord.js";
import { getUserReminders, deleteReminder } from "../../services/reminder.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { EMOJIS } from "../../utils/emojis.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const data = {
  name: "reminders",
  description: "Manage reminders.",
  dm_permission: false,
};

const ITEMS_PER_PAGE = 5;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatShortDate(timestamp) {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day}-${month}-${year} at ${hours}:${minutes} ${ampm}`;
}

function buildRemindersListPayload(
  reminders,
  page = 0,
  user,
  disabled = false,
) {
  const totalItems = reminders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentPage = Math.min(Math.max(0, page), totalPages - 1);
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const currentItems = reminders.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const containerComponents = [];

  const displayName = user.globalName || user.username;
  containerComponents.push({
    type: 10,
    content: `### ${EMOJIS.Timer} Reminders for ${displayName}`,
  });

  containerComponents.push({
    type: 14,
    divider: true,
    spacing: 1,
  });

  if (totalItems === 0) {
    containerComponents.push({
      type: 10,
      content:
        `You don't have any active reminders right now.\n\n` +
        `-# Use /remind to set one!`,
    });

    return {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.INFO,
          components: containerComponents,
        },
      ],
    };
  }

  currentItems.forEach((rem, idx) => {
    const unixSeconds = Math.floor(rem.triggerAt / 1000);
    const createdUnix = Math.floor(rem.createdAt / 1000);

    const taskText =
      rem.task.length > 80 ? rem.task.substring(0, 77) + "..." : rem.task;

    const row = {
      type: 9,
      components: [
        {
          type: 10,
          content:
            `**${taskText}**\n` +
            `Due: <t:${unixSeconds}:R>\n`
        },
      ],
      accessory: {
        type: 2,
        style: 4,
        custom_id: `rem_del_${rem.id}`,
        emoji: { name: "🗑️" },
        disabled: disabled,
      },
    };

    containerComponents.push(row);

    if (idx < currentItems.length - 1) {
      containerComponents.push({
        type: 14,
        divider: true,
        spacing: 1,
      });
    }
  });

  containerComponents.push({
    type: 14,
    divider: true,
    spacing: 1,
  });

  if (totalPages > 1) {
    const paginationRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          custom_id: "rem_prev_page",
          label: "Previous",
          disabled: disabled || currentPage === 0,
        },
        {
          type: 2,
          style: 2,
          custom_id: "rem_next_page",
          label: "Next",
          disabled: disabled || currentPage >= totalPages - 1,
        },
      ],
    };
    containerComponents.push(paginationRow);
  }

  containerComponents.push({
    type: 10,
    content: `-# Page ${currentPage + 1}/${totalPages} (${totalItems} reminder${totalItems === 1 ? "" : "s"})`,
  });

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.INFO,
        components: containerComponents,
      },
    ],
  };
}

function buildConfirmPayload(reminder) {
  const unixSeconds = Math.floor(reminder.triggerAt / 1000);
  const createdDate = formatShortDate(reminder.createdAt);

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.ERROR,
        components: [
          {
            type: 10,
            content: `### Delete this reminder?`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              `**Task:** ${reminder.task}\n` +
              `**Due:** <t:${unixSeconds}:R>\n` +
              `**Created:** ${createdDate}`,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                custom_id: `confirm_del_${reminder.id}`,
                label: "Delete",
                emoji: { name: "🗑️" },
              },
              {
                type: 2,
                style: 2,
                custom_id: `cancel_del_${reminder.id}`,
                label: "Cancel",
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildDeletedSuccessPayload(reminder) {
  const createdDate = formatShortDate(reminder.createdAt);

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: EMBED_COLORS.SUCCESS,
        components: [
          {
            type: 10,
            content: `### ${EMOJIS.Success} Reminder deleted`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              `**Task:** ${reminder.task}\n` + `**Created:** ${createdDate}`,
          },
        ],
      },
    ],
  };
}

export async function execute(interaction, client) {
  try {
    if (typeof interaction.deferReply === "function") {
      await interaction.deferReply().catch(() => null);
    }

    const user = interaction.user || interaction.author;
    let reminders = await getUserReminders(user.id);
    let currentPage = 0;

    const initialPayload = buildRemindersListPayload(
      reminders,
      currentPage,
      user,
    );

    let mainMessage;
    if (interaction.deferred || interaction.replied) {
      mainMessage = await interaction.editReply(initialPayload);
    } else {
      const response = await interaction.reply({
        ...initialPayload,
        withResponse: true,
      });
      mainMessage = response.resource?.message || (await interaction.fetchReply());
    }

    const collector = mainMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180000,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== user.id) {
        return btnInteraction.reply({
          content: "Run `/reminders` to view and manage your own reminders!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (btnInteraction.customId === "rem_prev_page") {
        currentPage = Math.max(0, currentPage - 1);
        reminders = await getUserReminders(user.id);
        const updatedPayload = buildRemindersListPayload(
          reminders,
          currentPage,
          user,
        );
        return await btnInteraction.update(updatedPayload);
      }

      if (btnInteraction.customId === "rem_next_page") {
        currentPage++;
        reminders = await getUserReminders(user.id);
        const updatedPayload = buildRemindersListPayload(
          reminders,
          currentPage,
          user,
        );
        return await btnInteraction.update(updatedPayload);
      }

      if (btnInteraction.customId.startsWith("rem_del_")) {
        const reminderId = btnInteraction.customId.replace("rem_del_", "");
        const targetReminder = reminders.find((r) => r.id === reminderId);

        if (!targetReminder) {
          return btnInteraction.reply({
            content: "This reminder was already deleted or expired.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const confirmPayload = buildConfirmPayload(targetReminder);

        const confirmResponse = await btnInteraction.reply({
          ...confirmPayload,
          withResponse: true,
        });
        const confirmMsg =
          confirmResponse.resource?.message ||
          (await btnInteraction.fetchReply());

        const confirmCollector = confirmMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60000,
        });

        confirmCollector.on("collect", async (subBtn) => {
          if (subBtn.user.id !== user.id) {
            return subBtn.reply({
              content: "You cannot interact with this confirmation.",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (subBtn.customId.startsWith("confirm_del_")) {
            await deleteReminder(targetReminder.id);

            const successPayload = buildDeletedSuccessPayload(targetReminder);
            await subBtn.update(successPayload);

            reminders = await getUserReminders(user.id);
            const refreshedList = buildRemindersListPayload(
              reminders,
              currentPage,
              user,
            );
            await mainMessage.edit(refreshedList).catch(() => null);
          } else if (subBtn.customId.startsWith("cancel_del_")) {
            await subBtn.message.delete().catch(() => null);
          }
        });

        confirmCollector.on("end", async (collected, reason) => {
          if (reason === "time") {
            await confirmMsg.delete().catch(() => null);
          }
        });
      }
    });

    collector.on("end", async () => {
      const disabledPayload = buildRemindersListPayload(
        reminders,
        currentPage,
        user,
        true,
      );
      await mainMessage.edit(disabledPayload).catch(() => null);
    });
  } catch (err) {
    logger.error("Error in reminders command handler:", err);
    Sentry.captureException(err);
  }
}
