import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import logger from "../utils/logger.js";
import * as Sentry from "@sentry/node";

const db = admin.firestore();
const remindersRef = db.collection("reminders");
const activeTimers = new Map();

function parseTimeRegex(inputText) {
  const timeRegex =
    /(?:in\s+)?(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\b/i;
  const match = inputText.match(timeRegex);

  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  let ms = 0;
  if (unit.startsWith("s")) ms = value * 1000;
  else if (unit.startsWith("m")) ms = value * 60 * 1000;
  else if (unit.startsWith("h")) ms = value * 60 * 60 * 1000;
  else if (unit.startsWith("d")) ms = value * 24 * 60 * 60 * 1000;

  let task = inputText.replace(match[0], "").trim();
  task = task.replace(/^(to|that|for|about)\s+/i, "").trim();

  if (!task) task = "Your scheduled reminder";

  return {
    delayMs: ms,
    task,
    timeString: match[0].trim(),
  };
}

export async function parseReminderInput(inputText) {
  if (!inputText || typeof inputText !== "string") {
    return null;
  }

  const cleanText = inputText.trim();

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze this user reminder request: "${cleanText}".
Current Unix Timestamp: ${Date.now()}.
Extract the duration in milliseconds from NOW until the reminder should fire, and extract the task/reason for the reminder.
Return ONLY a JSON object with this format, no markdown formatting or extra text:
{"delayMs": number, "task": string, "timeString": string}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let responseText = response.text || "";
      responseText = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(responseText);
      if (parsed && typeof parsed.delayMs === "number" && parsed.delayMs > 0) {
        return {
          delayMs: Math.max(1000, parsed.delayMs),
          task: parsed.task || cleanText,
          timeString:
            parsed.timeString || `${Math.round(parsed.delayMs / 60000)} mins`,
        };
      }
    } catch (err) {
      logger.warn(
        "AI parsing failed for reminder, falling back to regex:",
        err.message,
      );
    }
  }

  return parseTimeRegex(cleanText);
}

export async function saveAndScheduleReminder(client, reminderData) {
  const {
    id,
    userId,
    guildId,
    guildName,
    channelId,
    task,
    triggerAt,
    createdAt,
  } = reminderData;

  const docId =
    id || `${userId}_${triggerAt}_${Math.floor(Math.random() * 10000)}`;

  const reminderObj = {
    id: docId,
    userId,
    guildId: guildId || "DM",
    guildName: guildName || "Direct Messages",
    channelId,
    task,
    triggerAt,
    createdAt: createdAt || Date.now(),
  };

  try {
    await remindersRef.doc(docId).set(reminderObj);
  } catch (err) {
    logger.warn(
      "Failed to persist reminder to Firestore, running in-memory:",
      err.message,
    );
  }

  scheduleInMemoryTimer(client, reminderObj);
  return reminderObj;
}

function scheduleInMemoryTimer(client, reminderObj) {
  if (activeTimers.has(reminderObj.id)) {
    clearTimeout(activeTimers.get(reminderObj.id));
  }

  const delayMs = Math.max(0, reminderObj.triggerAt - Date.now());

  if (delayMs > 2147483647) {
    logger.warn(
      `Reminder ${reminderObj.id} is beyond 24 days, skipping in-memory timer.`,
    );
    return;
  }

  const timer = setTimeout(async () => {
    activeTimers.delete(reminderObj.id);
    await deliverReminder(client, reminderObj);
  }, delayMs);

  activeTimers.set(reminderObj.id, timer);
}

export async function initReminderManager(client) {
  try {
    const snapshot = await remindersRef.get();
    if (snapshot.empty) return;

    const now = Date.now();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.triggerAt <= now) {
        await deliverReminder(client, data);
      } else {
        scheduleInMemoryTimer(client, data);
      }
    }
  } catch (err) {
    logger.warn(
      "Failed to initialize reminder manager from Firestore:",
      err.message,
    );
  }
}

export async function deliverReminder(client, reminder) {
  try {
    try {
      await remindersRef.doc(reminder.id).delete();
    } catch (_) {}

    const reminderPayload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 0x7583ff,
          components: [
            {
              type: 10,
              content:
                `## <:Timer:1542147643021725796> Reminder\n` +
                `Hey <@${reminder.userId}>! You asked to be reminded of:`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: `> **${reminder.task}**`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: `-# Set <t:${Math.floor(reminder.createdAt / 1000)}:R>`,
            },
          ],
        },
      ],
    };

    if (reminder.channelId) {
      const channel = await client.channels
        .fetch(reminder.channelId)
        .catch(() => null);
      if (channel && typeof channel.send === "function") {
        await channel.send(reminderPayload).catch((chanErr) => {
          logger.warn(
            `Could not send reminder to channel ${reminder.channelId}:`,
            chanErr.message,
          );
        });
      }
    }
  } catch (err) {
    logger.error(`Error delivering reminder ${reminder.id}:`, err);
    Sentry.captureException(err);
  }
}
