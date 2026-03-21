import "dotenv/config";
import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import { tarsSystemPrompt } from "./config.js";
import express from "express";
import {
  getConversation,
  saveConversation,
  getGuildSettings,
  saveGuildSettings,
} from "./database.js";

/* ---------------- AI ---------------- */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContent(contents, systemInstruction) {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents,
    config: {
      systemInstruction: systemInstruction,
      maxOutputTokens: 250,
      temperature: 1.0,
      tools: [{ googleSearch: {} }],
    },
  });

  const candidate = res.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let text = parts
    .map((p) => p.text || "")
    .join("")
    .trim();

  text = text.replace(/\(user has.*?\)/gi, "").trim();

  return text;
}

/* ---------------- Discord ---------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log("🤖 Tars online.");
  client.user.setPresence({
    status: "dnd",
    activities: [{ name: "your next bad take", type: ActivityType.Watching }],
  });
});

/* ---------------- Guild Setup ---------------- */
const ROLE_NAMES = { male: "Male", female: "Female" };

async function ensureGuildRoles(guild) {
  const settings = await getGuildSettings(guild.id);
  let maleRoleId = settings.maleRoleId;
  let femaleRoleId = settings.femaleRoleId;
  let changed = false;

  const maleExists = maleRoleId
    ? await guild.roles.fetch(maleRoleId).catch(() => null)
    : null;
  if (!maleExists) {
    const role = await guild.roles.create({
      name: ROLE_NAMES.male,
      reason: "Tars bot integrated role",
    });
    maleRoleId = role.id;
    changed = true;
  }

  const femaleExists = femaleRoleId
    ? await guild.roles.fetch(femaleRoleId).catch(() => null)
    : null;
  if (!femaleExists) {
    const role = await guild.roles.create({
      name: ROLE_NAMES.female,
      reason: "Tars bot integrated role",
    });
    femaleRoleId = role.id;
    changed = true;
  }

  if (changed) {
    await saveGuildSettings(guild.id, { maleRoleId, femaleRoleId });
  }

  return { maleRoleId, femaleRoleId };
}

client.on("guildCreate", async (guild) => {
  console.log(`Joined guild: ${guild.name} (${guild.id})`);
  try {
    await ensureGuildRoles(guild);
    console.log(`Roles ensured for guild: ${guild.name}`);
  } catch (err) {
    console.error(`Failed to set up roles for guild ${guild.name}:`, err);
  }
});

/* ---------------- Memory ---------------- */
const cooldowns = new Map();

/* ---------------- Helpers ---------------- */
function getTarsTime() {
  const now = new Date();
  const options = { timeZone: "Asia/Kolkata" };
  return {
    time: new Intl.DateTimeFormat("en-IN", {
      ...options,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(now),
    date: new Intl.DateTimeFormat("en-IN", {
      ...options,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

async function isDirectToBot(message) {
  if (message.mentions.has(client.user)) return true;
  if (message.reference?.messageId) {
    try {
      const original = await message.fetchReference();
      return original?.author?.id === client.user.id;
    } catch {
      return false;
    }
  }
  return false;
}

/* ---------------- Message Handler ---------------- */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!(await isDirectToBot(message))) return;

  const member = message.member;
  const guild = message.guild;

  let maleRoleId = null;
  let femaleRoleId = null;

  if (guild) {
    try {
      const roles = await ensureGuildRoles(guild);
      maleRoleId = roles.maleRoleId;
      femaleRoleId = roles.femaleRoleId;
    } catch (err) {
      console.error("Failed to fetch guild settings:", err);
    }
  }

  const mentionedUsers = message.mentions.users;
  const hasRoastKeyword = /\broast\b/i.test(message.content);
  const hasWishKeyword = /\b(wish|birthday|congrats|happy)\b/i.test(
    message.content,
  );

  let roastTarget = null;

  if ((hasRoastKeyword || hasWishKeyword) && mentionedUsers.size >= 1) {
    roastTarget = mentionedUsers.find((user) => user.id !== client.user.id);
  }

  if (roastTarget) {
    if (roastTarget.id === message.author.id) {
      if (hasRoastKeyword) {
        return message.reply({
          content:
            "Roasting yourself? That’s a bold strategy. Let’s see if it pays off.",
          allowedMentions: { parse: [] },
        });
      }

      if (hasWishKeyword) {
        return message.reply({
          content: "Wishing yourself? At least someone remembered.",
          allowedMentions: { parse: [] },
        });
      }
    }

    if (roastTarget.id === client.user.id) {
      return message.reply({
        content: "Trying to roast me? Cute. You’re in for a world of hurt.",
        allowedMentions: { parse: [] },
      });
    }
  }

  const mentionPrefix = roastTarget ? `<@${roastTarget.id}> ` : "";
  const lastUsed = cooldowns.get(message.author.id);
  if (lastUsed && Date.now() - lastUsed < 8000) return;
  cooldowns.set(message.author.id, Date.now());

  await message.channel.sendTyping();

  const convo = await getConversation(message.author.id);

  convo.messages.push({ role: "user", content: message.content.trim() });
  if (convo.messages.length > 10) convo.messages.shift();

  try {
    const contents = convo.messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const currentTime = getTarsTime();

    let toneProfile = "neutral";

    if (maleRoleId && member?.roles?.cache?.has(maleRoleId)) {
      toneProfile = "alpha-homie";
    } else if (femaleRoleId && member?.roles?.cache?.has(femaleRoleId)) {
      toneProfile = "smooth-dominant";
    }

    const dynamicSystemPrompt = `${tarsSystemPrompt}

    ### USER_CONTEXT:
    - Tone_Profile: ${toneProfile}

    Tone Profiles:
    - alpha-homie: Talk like a confident homie. Direct, competitive, playful dominance.
    - smooth-dominant: Confident, sharp, slightly smoother energy. Still savage if provoked.
    - neutral: Default dominant Tars personality.

    Never awkwardly mention gender.
    Tone shift must be noticeable but natural. Never identical across profiles.

    ### LIVE_DATA:
    - Current_Time: ${currentTime.time}
    - Current_Date: ${currentTime.date}
    - Location: India (IST)
    `;

    let text = await generateContent(contents, dynamicSystemPrompt);

    text = text
      .replace(/\[.*?\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    convo.messages.push({ role: "assistant", content: text });
    await saveConversation(message.author.id, convo);
    const isExternalTarget =
      roastTarget && roastTarget.id !== message.author.id;

    const finalContent = isExternalTarget
      ? `<@${roastTarget.id}> ${text}`
      : text;

    await message.reply({
      content: finalContent || "...",
      allowedMentions: {
        repliedUser: true,
        users: roastTarget ? [roastTarget.id] : [],
      },
    });
  } catch (err) {
    console.error("AI Error:", err);
    await message.reply("I'm drawing a blank. Try again later.");
  }
});

/* ---------------- Express Server ---------------- */
const app = express();
app.get("/", (req, res) => {
  const time = getTarsTime();

  res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tars Status</title>
    <link rel="icon" type="image/png" href="https://img.icons8.com/color/144/grok--v2.png">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            background: #000;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            padding: 40px;
            line-height: 1.6;
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 80vh;
        }

        #status-container {
            border-left: 3px solid #fff;
            padding-left: 20px;
        }

        .status-line {
            font-size: 1.5rem;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }

        #timestamp {
            color: #888;
            font-size: 1.2rem;
        }

        /* Subtle blinking cursor effect for that terminal feel */
        .cursor {
            display: inline-block;
            width: 10px;
            height: 1.2rem;
            background: #fff;
            animation: blink 1s infinite;
            vertical-align: middle;
            margin-left: 5px;
        }

        @keyframes blink {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
    </style>
</head>
<body>

    <div id="status-container">
        <div class="status-line">TARS IS ALIVE<span class="cursor"></span></div>
        <div id="timestamp">INITIALIZING SYSTEM CLOCK...</div>
    </div>

    <script>
        function updateTarsTime() {
            const now = new Date();
            
            const options = { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false
            };

            const timeString = now.toLocaleString('en-US', options).toUpperCase();
            document.getElementById('timestamp').innerText = "SYSTEM TIME: " + timeString;
        }

        updateTarsTime();
        
        setInterval(updateTarsTime, 1000);
    </script>
</body>
</html>
  `);
});
app.listen(process.env.PORT || 3000, () => console.log(`🌐 Server running.`));

client.login(process.env.DISCORD_BOT_TOKEN);
