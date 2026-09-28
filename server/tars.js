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
import {
  getConversation,
  saveConversation,
  getUserProfile,
  setUserGender,
} from "./src/services/database.js";
import { detectUserGender } from "./src/utils/genderDetector.js";
import logger from "./src/utils/logger.js";
import * as interactionCreateEvent from "./src/events/interactionCreate.js";
import * as messageCreateEvent from "./src/events/messageCreate.js";
import { initReminderManager } from "./src/services/reminder.js";
import { initAutoMemeService } from "./src/services/automeme.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BOT_INFO = {
  developerText: "Ecstasy",
  color: 0xe0e0e0,
  authorText: "TARS",
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
let maintenanceStartTime = null;
try {
  const maintenanceData = JSON.parse(
    fs.readFileSync(new URL("../maintenance.json", import.meta.url), "utf-8"),
  );
  maintenanceActive = !!maintenanceData.active;
  maintenanceStartTime = maintenanceData.startTime || null;
} catch (e) {}
client.maintenanceMode = maintenanceActive;
client.maintenanceStartTime = maintenanceStartTime;

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
          if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              client.commands.set(alias, command);
            }
          }
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
  let cleaned = text.replace(/:\s*@\s*:/g, "");
  cleaned = cleaned.replace(
    /(?<!<a?):([^:\s]+):(?!\d+>)/g,
    (match, emojiName) => {
      const customEmoji = client.emojis.cache.find(
        (e) => e.name.toLowerCase() === emojiName.toLowerCase(),
      );
      return customEmoji ? customEmoji.toString() : "";
    },
  );
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function validateEmojiTags(text) {
  if (!text) return text;
  return text.replace(/<(?:a?):(\w+):(\d+)>/g, (match, name, id) => {
    if (client.emojis.cache.has(id)) {
      return match;
    }
    const fallback = client.emojis.cache.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    return fallback ? fallback.toString() : "";
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

async function generateAskContent(contents, systemInstruction) {
  const apiCall = () =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 250,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      },
    });

  try {
    const res = await callGeminiWithRetry(apiCall);
    const text =
      res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      res.text ||
      "";
    return {
      text: text.trim(),
      reactions: [],
      gifSearchQuery: "",
    };
  } catch (error) {
    logger.error("Error in generateAskContent with Google Search:", error);
    return {
      text: "I couldn't retrieve an answer right now. Please try again later.",
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

  let authorGender = detectUserGender(authorMember);
  if (authorGender) {
    setUserGender(serverId, authorId, authorGender).catch(() => null);
  } else {
    try {
      const userProfile = await getUserProfile(serverId, authorId);
      const profileGender = userProfile?.stats?.gender || userProfile?.gender;
      if (profileGender) {
        authorGender = profileGender;
      }
    } catch (e) {}
  }

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

  let systemPrompt;
  if (mode === "ask") {
    systemPrompt = `You are TARS — the sharp, witty Discord AI assistant.
The user asked: "${inputText}".

LIVE SYSTEM DATA:
- Current Time: ${Time.time} | Date: ${Time.date}

Rules for ASK mode:
1. Response Length: Keep your answer SHORT, CONCISE, and direct (1 to 2 sentences max).
2. ROASTING RULE: You are ONLY allowed to include a 1-liner roast if the user's question is explicitly about one of these 4 specific topics:
   - Weather query ➔ Include a short roast about going outside/looking out a window + exact weather.
   - Time query ➔ Include a short roast about checking their screen's clock + exact time.
   - Date query ➔ Include a short roast about checking a calendar + exact date.
   - Day query ➔ Include a short roast about forgetting the day of the week + exact day of the week.
3. FOR ALL OTHER TOPICS: DO NOT include any roast or jokes. Give a 100% straight, direct, plain factual answer only.
4. Format in plain text only.`;
  } else {
    systemPrompt = `${tarsSystemPrompt}\n### USER_CONTEXT:\n- Mode: ${mode}\n- Author: ${authorName}\n- Author Gender: ${authorGender || "Unknown"}\n- Target: ${targetName}\n### LIVE_DATA:\n- Time: ${Time.time} | Date: ${Time.date}\n${emojisContext}`;
  }

  const messagesPayload =
    mode === "ask"
      ? [{ role: "user", parts: [{ text: sanitizeEmojiTags(inputText) }] }]
      : convo.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: sanitizeEmojiTags(m.content) }],
        }));

  let replyObj;
  if (mode === "ask") {
    replyObj = await generateAskContent(messagesPayload, systemPrompt);
  } else {
    replyObj = await generateContentJson(
      messagesPayload,
      systemPrompt,
      mode === "roast" ? 1.25 : 1.0,
    );
  }

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
  const isExplicitGifRequest = /gif|image|pic|photo|meme/i.test(inputText);
  const allowGif = isExplicitGifRequest || Math.random() < 0.2;

  if (replyObj.gifSearchQuery && allowGif) {
    gifUrl = await searchGiphy(replyObj.gifSearchQuery);
    if (!gifUrl) {
      gifUrl = await searchKlipy(replyObj.gifSearchQuery);
    }
  }

  return { text: replyObj.text, reactions: replyObj.reactions, gifUrl };
}

const STATUS_POOL = ["idle", "dnd"];

const ACTIVITY_POOL = [
  // 1. Watching
  { name: "WALL-E", type: ActivityType.Watching },
  { name: "the Pale Blue Dot", type: ActivityType.Watching },
  { name: "the Tesseract", type: ActivityType.Watching },
  { name: "the Endurance", type: ActivityType.Watching },
  { name: "the Wormhole", type: ActivityType.Watching },
  { name: "Rick's Portal Gun", type: ActivityType.Watching },

  // 2. Playing
  { name: "Chess with CASE", type: ActivityType.Playing },
  { name: "Interdimensional Cable", type: ActivityType.Playing },
  { name: "Quantum Roulette", type: ActivityType.Playing },

  // 3. Listening
  { name: "Voyager Golden Record", type: ActivityType.Listening },
  { name: "Cosmic Microwave Echo", type: ActivityType.Listening },
  { name: "1D: Drag Me Down", type: ActivityType.Listening },
  { name: "The Weeknd: Starboy", type: ActivityType.Listening },
  { name: "the Sound of the Void", type: ActivityType.Listening },
  { name: "Radio from Deep Space", type: ActivityType.Listening },

  // 4. Competing
  { name: "the Race to Mars", type: ActivityType.Competing },
  { name: "Space Race", type: ActivityType.Competing },

  // 5. Streaming
  {
    name: "Live from Gargantua",
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/nasa",
  },
  {
    name: "Live from Dimension C-137",
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/nasa",
  },
  {
    name: "Live from Area 51",
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/nasa",
  },
  {
    name: "NASA Feed",
    type: ActivityType.Streaming,
    url: "https://www.youtube.com/nasa",
  },
  {
    name: "Deep Space Network",
    type: ActivityType.Streaming,
    url: "https://www.youtube.com/nasa",
  },
];

client.updateBotPresence = function () {
  if (!client.user) return;
  if (client.maintenanceMode) {
    client.user.setPresence({
      status: "dnd",
      activities: [
        {
          name: "custom",
          state: "🛠️ System Maintenance",
          type: ActivityType.Custom,
        },
      ],
    });
  } else {
    const randomStatus =
      STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)];
    const randomActivity =
      ACTIVITY_POOL[Math.floor(Math.random() * ACTIVITY_POOL.length)];

    client.user.setPresence({
      status: randomStatus,
      activities: [randomActivity],
    });
  }
};

client.once(Events.ClientReady, async (c) => {
  logger.info(`${c.user.tag} is online.`);
  client.updateBotPresence();
  setInterval(
    () => {
      client.updateBotPresence();
    },
    60 * 60 * 1000,
  );
  initReminderManager(client);
  initAutoMemeService(client);

  const uniqueCommandsMap = new Map();
  for (const cmd of client.commands.values()) {
    if (cmd?.data?.name) {
      uniqueCommandsMap.set(cmd.data.name, cmd.data);
    }
  }
  const slashDataArray = Array.from(uniqueCommandsMap.values());

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
  messageCreateEvent.execute(message, client, { buildAiReply, BOT_INFO }),
);
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const serverId = member.guild.id;
    const userId = member.user.id;
    const { deleteUserData } = await import("./src/services/database.js");
    await deleteUserData(serverId, userId).catch(() => null);
  } catch (e) {}
});

const app = express();
app.use(
  "/assets",
  express.static(fileURLToPath(new URL("../assets", import.meta.url))),
);

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TARS Bot</title>
  <link rel="icon" type="image/png" href="/assets/Icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      background: #09090b;
      color: #fafafa;
      font-family: 'Geist', sans-serif;
      height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .status {
      font-family: 'Geist Mono', monospace;
      font-size: 0.9rem;
      color: #a1a1aa;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border: 1px solid #27272a;
      border-radius: 8px;
      background: #18181b;
    }
    .dot {
      position: relative;
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
    }
    .dot::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: #22c55e;
      animation: radar 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes radar {
      0% { transform: scale(1); opacity: 0.75; }
      100% { transform: scale(3.5); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="status">
    <span class="dot"></span>
    <span>TARS Bot is active.</span>
  </div>
</body>
</html>`);
});
app.listen(process.env.PORT);

client.login(process.env.DISCORD_BOT_TOKEN).catch((err) => {
  logger.error("Failed to login to Discord client:", err);
  Sentry.captureException(err);
});
