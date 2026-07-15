import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs";
dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 });
}

import { Client, GatewayIntentBits, ActivityType, Events } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import express from "express";
import { tarsSystemPrompt } from "./src/config.js";
import { getConversation, saveConversation } from "./src/services/database.js";
import logger from "./src/utils/logger.js";
import * as interactionCreateEvent from "./src/events/interactionCreate.js";
import * as messageCreateEvent from "./src/events/messageCreate.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BOT_INFO = {
  developerText: "Ecstasy",
  color: 0xe0e0e0,
  authorText: "Tars",
  version: "3.0",
  framework: "discord.js",
  settings: { honesty: "90%", humor: "75%", discretion: "10%" },
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
let maintenanceActive = false;
try {
  const maintenanceData = JSON.parse(
    fs.readFileSync(new URL("../maintenance.json", import.meta.url), "utf-8")
  );
  maintenanceActive = !!maintenanceData.active;
} catch (e) {
}
client.maintenanceMode = maintenanceActive;

client.commands = new Map();

async function loadCommands() {
  const commandsPath = new URL("./src/commands/", import.meta.url);
  async function walk(dirUrl) {
    const files = fs.readdirSync(dirUrl, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        await walk(new URL(`${file.name}/`, dirUrl));
      } else if (file.name.endsWith(".js")) {
        const commandUrl = new URL(file.name, dirUrl).href;
        const command = await import(commandUrl);
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
        } else {
          logger.warn(`Skipped loading invalid command at: ${commandUrl}`);
        }
      }
    }
  }
  await walk(commandsPath);
}
await loadCommands();

async function callGeminiWithRetry(apiCallFn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCallFn();
    } catch (error) {
      const status = error.status || error.statusCode;
      const isTransient =
        status === 503 ||
        status === 429 ||
        error.message?.includes("503") ||
        error.message?.includes("429");

      if (isTransient && i < retries - 1) {
        logger.warn(
          `Gemini API returned ${status || "Transient Error"}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
}

async function searchGiphy(query) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey || !query || query.trim() === "") return null;
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=10&rating=r`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const results = json.data || [];
    if (results.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * results.length);
    return results[randomIndex]?.images?.original?.url || null;
  } catch (error) {
    logger.error("Giphy Search Error:", error);
    return null;
  }
}

async function searchKlipy(query) {
  const apiKey = process.env.KLIPY_API_KEY;
  if (!apiKey || !query || query.trim() === "") return null;
  try {
    const url = `https://api.klipy.com/v2/search?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const results = json.results || json.data || [];
    if (results.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * results.length);
    const item = results[randomIndex];
    return item?.gif_url || item?.url || item?.media?.[0]?.gif?.url || null;
  } catch (error) {
    logger.error("Klipy Search Error:", error);
    return null;
  }
}

client.resolveEmoji = function (emojiInput) {
  if (!emojiInput) return emojiInput;
  const match = emojiInput.match(/<?a?:?\w+:(\d+)>?/);
  const id = match ? match[1] : emojiInput.trim();

  const customEmoji =
    client.emojis.cache.get(id) ||
    client.emojis.cache.find(
      (e) => e.name.toLowerCase() === id.toLowerCase() || e.id === id,
    );
  return customEmoji || emojiInput.trim();
};

function replaceEmojiNamesWithTags(text, guild) {
  if (!text) return text;
  return text.replace(/(?<!<a?):(\w+):(?!\d+>)/g, (match, emojiName) => {
    const customEmoji = client.emojis.cache.find(
      (e) => e.name.toLowerCase() === emojiName.toLowerCase(),
    );
    return customEmoji ? customEmoji.toString() : match;
  });
}

function validateEmojiTags(text) {
  if (!text) return text;
  return text.replace(/<(?:a?):(\w+):(\d+)>/g, (match, name, id) => {
    if (client.emojis.cache.has(id)) {
      return match;
    }
    const fallback = client.emojis.cache.find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    return fallback ? fallback.toString() : `:${name}:`;
  });
}

async function generateContentJson(
  contents,
  systemInstruction,
  temperature = 1.0,
) {
  const apiCall = () =>
    ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 500,
        temperature,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            text: {
              type: "STRING",
              description:
                "Short line under 25 words or empty if only reacting.",
            },
            reactions: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Max 1 emoji or empty.",
            },
            gifSearchQuery: {
              type: "STRING",
              description: "Search query or empty.",
            },
          },
          required: ["text", "reactions", "gifSearchQuery"],
        },
      },
    });

  try {
    const res = await callGeminiWithRetry(apiCall);
    const jsonText =
      res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      "{}";
    const parsed = JSON.parse(jsonText);
    return {
      text: parsed.text || "",
      reactions: Array.isArray(parsed.reactions)
        ? parsed.reactions.slice(0, 1)
        : [],
      gifSearchQuery: parsed.gifSearchQuery || "",
    };
  } catch (error) {
    return {
      text: "My sarcasm core processor short-circuited.",
      reactions: [],
      gifSearchQuery: "",
    };
  }
}

function sanitizeEmojiTags(text) {
  if (!text) return text;
  return text
    .replace(/<+a?:?([^:\s>]+?):?\d*>+\d*>?/g, ":$1:")
    .replace(/:(\w+)::?\d*>?/g, ":$1:");
}

function cleanReplyText(text) {
  if (!text) return text;
  return sanitizeEmojiTags(
    text.replace(/\[.*?\]/g, "").replace(/\s{2,}/g, " "),
  ).trim();
}

function isSoftRoastReply(text) {
  if (!text || text.trim() === "") return false;
  const softPatterns = [
    /\b(maybe|perhaps|try|should|could|please|sorry|improve)\b/i,
  ];
  return softPatterns.some((p) => p.test(text)) || text.split(/\s+/).length < 6;
}

function getTarsTime() {
  const options = {
    timeZone: "Asia/Kolkata",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
  };
  const dateOptions = {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
  };
  const now = new Date();
  return {
    time: new Intl.DateTimeFormat("en-IN", options).format(now),
    date: new Intl.DateTimeFormat("en-IN", dateOptions).format(now),
  };
}

export async function buildAiReply({
  authorId,
  inputText,
  mode,
  authorMember,
  targetMember,
  guild,
}) {
  const serverId = guild?.id || "DM";
  const convo = await getConversation(serverId, authorId);
  convo.messages.push({ role: "user", content: inputText.trim() });
  if (convo.messages.length > 10) convo.messages.shift();

  const authorName = authorMember
    ? authorMember.displayName || authorMember.user.username
    : "User";
  const targetName = targetMember
    ? targetMember.displayName || targetMember.user.username
    : "Self";
  const Time = getTarsTime();

  let emojisContext = "";
  try {
    const globalCustomEmojis = Array.from(client.emojis.cache.values());
    if (globalCustomEmojis.length > 0) {
      const sampledEmojis = globalCustomEmojis
        .sort(() => 0.5 - Math.random())
        .slice(0, 40);
      emojisContext =
        `\n### GLOBAL CUSTOM EMOJIS (ACROSS ALL SERVERS):\n` +
        sampledEmojis
          .map((e) => `- Name: "${e.name}", Code: ":${e.name}:"`)
          .join("\n") +
        `\n\nInstructions: You have a superpower—you can use custom emojis from ANY server I am in! Include them in your text reply via Code format (e.g., :emoji_name:) or in your "reactions" array. Match your savage, edgy persona perfectly with these choices.`;
    }
  } catch (e) {
    logger.warn("Could not aggregate global client emojis:", e);
  }

  const systemPrompt = `${tarsSystemPrompt}\n### USER_CONTEXT:\n- Mode: ${mode}\n- Author: ${authorName}\n- Target: ${targetName}\n### LIVE_DATA:\n- Time: ${Time.time} | Date: ${Time.date}\n${emojisContext}`;

  let replyObj = await generateContentJson(
    convo.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: sanitizeEmojiTags(m.content) }],
    })),
    systemPrompt,
    mode === "roast" ? 1.25 : 1.0,
  );

  replyObj.text = cleanReplyText(replyObj.text);

  if (mode === "roast" && isSoftRoastReply(replyObj.text)) {
    replyObj = await generateContentJson(
      convo.messages.map((m) => ({
        role: "user",
        parts: [{ text: sanitizeEmojiTags(m.content) }],
      })),
      `${systemPrompt}\n\n### OVERRIDE: Previous draft weak. Recalibrate for max destruction.`,
      1.4,
    );
    replyObj.text = cleanReplyText(replyObj.text);
  }

  replyObj.text = replaceEmojiNamesWithTags(replyObj.text, guild);
  replyObj.text = validateEmojiTags(replyObj.text);

  if (replyObj.text && replyObj.text.trim() !== "") {
    convo.messages.push({ role: "assistant", content: replyObj.text });
    await saveConversation(serverId, authorId, convo);
  }

  let gifUrl = null;
  if (replyObj.gifSearchQuery) {
    gifUrl = await searchGiphy(replyObj.gifSearchQuery);
    if (!gifUrl) {
      gifUrl = await searchKlipy(replyObj.gifSearchQuery);
    }
  }

  return { text: replyObj.text, reactions: replyObj.reactions, gifUrl };
}

client.once(Events.ClientReady, async (c) => {
  logger.info(`${c.user.tag} is online.`);
  c.user.setPresence({
    status: "dnd",
    activities: [
  {
    name: "your next bad take",
    type: ActivityType.Watching,
  },
],
  });

  const slashDataArray = Array.from(client.commands.values()).map(
    (cmd) => cmd.data,
  );

  await c.application.commands
    .set(slashDataArray)
    .catch((err) => logger.error("Sync Failure", err));
});

client.on(Events.InteractionCreate, (interaction) =>
  interactionCreateEvent.execute(interaction, client, {
    buildAiReply,
    BOT_INFO,
  }),
);
client.on(Events.MessageCreate, (message) =>
  messageCreateEvent.execute(message, client, { buildAiReply }),
);

const app = express();
app.get("/", (req, res) => res.send("Tars Bot is active."));
app.listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_BOT_TOKEN).catch((err) => {
  logger.error("Failed to login to Discord client:", err);
  Sentry.captureException(err);
});
