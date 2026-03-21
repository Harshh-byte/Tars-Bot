import "dotenv/config";
import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import { tarsSystemPrompt } from "./config.js";
import express from "express";
import { getConversation, saveConversation } from "./database.js";

/* ---------------- AI ---------------- */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContent(contents, systemInstruction, temperature = 1.0) {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents,
    config: {
      systemInstruction: systemInstruction,
      maxOutputTokens: 250,
      temperature,
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

function cleanReplyText(text) {
  return text
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isSoftRoastReply(text) {
  const normalized = text.toLowerCase();
  const softPatterns = [
    /\b(maybe|perhaps|i think|i guess|try|should|could|please|sorry)\b/,
    /\b(be better|improve|you can do better|next time)\b/,
    /\b(good luck|all the best)\b/,
  ];

  const hasSoftLanguage = softPatterns.some((pattern) =>
    pattern.test(normalized),
  );
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return hasSoftLanguage || wordCount < 6;
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

function getGenderMeta(member, maleRoleId, femaleRoleId) {
  if (member?.roles?.cache?.has(femaleRoleId)) {
    return {
      gender: "female",
      subject: "she",
      object: "her",
      possessive: "her",
    };
  }
  if (member?.roles?.cache?.has(maleRoleId)) {
    return { gender: "male", subject: "he", object: "him", possessive: "his" };
  }
  return {
    gender: "unknown",
    subject: "they",
    object: "them",
    possessive: "their",
  };
}

/* ---------------- Message Handler ---------------- */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!(await isDirectToBot(message))) return;

  const MALE_ROLE_ID = "1283084809912193055";
  const FEMALE_ROLE_ID = "1283084870431805561";

  const member = message.member;

  const authorGenderMeta = getGenderMeta(member, MALE_ROLE_ID, FEMALE_ROLE_ID);

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

    let targetGenderMeta = null;
    if (roastTarget && message.guild) {
      const targetMember =
        message.guild.members.cache.get(roastTarget.id) ||
        (await message.guild.members.fetch(roastTarget.id).catch(() => null));
      if (targetMember) {
        targetGenderMeta = getGenderMeta(
          targetMember,
          MALE_ROLE_ID,
          FEMALE_ROLE_ID,
        );
      }
    }

    let toneProfile = "neutral";

    if (member?.roles?.cache?.has(MALE_ROLE_ID)) {
      toneProfile = "alpha-homie";
    } else if (member?.roles?.cache?.has(FEMALE_ROLE_ID)) {
      toneProfile = "smooth-dominant";
    }

    const dynamicSystemPrompt = `${tarsSystemPrompt}

    ### USER_CONTEXT:
    - Interaction_Mode: ${hasRoastKeyword ? "roast" : hasWishKeyword ? "wish" : "normal"}
    - Roast_Aggression_Level: ${hasRoastKeyword ? "10/10" : "n/a"}
    - Tone_Profile: ${toneProfile}
    - Author_Gender: ${authorGenderMeta.gender}
    - Author_Pronouns: ${authorGenderMeta.subject}/${authorGenderMeta.object}/${authorGenderMeta.possessive}
    - Target_Gender: ${targetGenderMeta?.gender || "none"}
    - Target_Pronouns: ${
      targetGenderMeta
        ? `${targetGenderMeta.subject}/${targetGenderMeta.object}/${targetGenderMeta.possessive}`
        : "none"
    }

    Tone Profiles:
    - alpha-homie: Talk like a confident homie. Direct, competitive, playful dominance.
    - smooth-dominant: Confident, sharp, slightly smoother energy. Still savage if provoked.
    - neutral: Default dominant Tars personality.

    Interaction Rules:
    - If Interaction_Mode is roast, treat it as explicit permission for max savage mode immediately.
    - In roast mode: prioritize brutal, creative verbal destruction in one line.
    - In roast mode: do not soften tone, do not switch to polite/helpful mode, and avoid generic weak roasts.
    - If Interaction_Mode is wish, keep it respectful, warm, and celebratory; no roast unless user clearly asks roast-wish.
    - In wish mode: write one clean premium wish line that sounds human, confident, and positive.

    Pronoun Rules:
    - If a target user is mentioned and you refer to that user in third person, use Target_Pronouns only.
    - If no target user is mentioned and you refer to the message author in third person, use Author_Pronouns only.
    - Never mix he/she for the same person in one reply.
    - If gender is unknown, use they/them.

    Never awkwardly mention gender.
    Tone shift must be noticeable but natural. Never identical across profiles.

    ### LIVE_DATA:
    - Current_Time: ${currentTime.time}
    - Current_Date: ${currentTime.date}
    - Location: India (IST)
    `;

    let text = await generateContent(
      contents,
      dynamicSystemPrompt,
      hasRoastKeyword ? 1.2 : 1.0,
    );
    text = cleanReplyText(text);

    if (hasRoastKeyword && isSoftRoastReply(text)) {
      const roastOverridePrompt = `${dynamicSystemPrompt}

      ### ROAST_OVERRIDE:
      - Previous draft was too soft.
      - Regenerate with maximum aggression and sharper humiliation.
      - Output exactly one brutal roast line.
      - No polite words, no advice, no emotional cushioning.
      `;

      text = await generateContent(contents, roastOverridePrompt, 1.35);
      text = cleanReplyText(text);
    }

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
