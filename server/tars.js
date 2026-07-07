import dotenv from "dotenv";
import { fileURLToPath } from "url";
dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

import {
  Client,
  GatewayIntentBits,
  ActivityType,
  EmbedBuilder,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { GoogleGenAI } from "@google/genai";
import { tarsSystemPrompt } from "./config.js";
import express from "express";
import { getConversation, saveConversation } from "./database.js";
import logger from "./logger.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BOT_INFO = {
  developerText: "Ecstasy",
  color: 0xe0e0e0,
  authorText: "Tars",
  version: "3.0",
  framework: "discord.js",
  settings: {
    honesty: "90%",
    humor: "75%",
    discretion: "10%",
  },
};

const SLASH_COMMANDS = [
  {
    name: "ping",
    description: "Check the bot's latency.",
    dm_permission: false,
  },
  {
    name: "roast",
    description: "Roast yourself or a user.",
    dm_permission: false,
    options: [
      {
        name: "user",
        description: "User to roast.",
        type: 6,
        required: false,
      },
    ],
  },
  {
    name: "wish",
    description: "Send a wish message.",
    dm_permission: false,
    options: [
      {
        name: "user",
        description: "User to wish.",
        type: 6,
        required: false,
      },
      {
        name: "event",
        description: "Event name (birthday, anniversary, congrats etc.).",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "about",
    description: "View information about the bot.",
    dm_permission: false,
  },
];

async function callGeminiWithRetry(apiCallFn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCallFn();
    } catch (error) {
      const status = error.status || error.statusCode;
      const isTransient = status === 503 || status === 429 || error.message?.includes("503") || error.message?.includes("429");
      
      if (isTransient && i < retries - 1) {
        logger.warn(`Gemini API returned ${status || "Transient Error"}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
}

async function generateContent(contents, systemInstruction, temperature = 1.0) {
  const apiCall = () => ai.models.generateContent({
    model: 	"gemini-2.5-flash-lite",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 250,
      temperature,
      tools: [{ googleSearch: {} }],
    },
  });

  try {
    const res = await callGeminiWithRetry(apiCall);
    const text =
      res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      "";
    return text.replace(/\(user has.*?\)/gi, "").trim();
  } catch (error) {
    logger.error("Error in generateContent:", error);
    Sentry.captureException(error);
    return "My brain is too overloaded to think right now.";
  }
}

async function searchGiphy(query) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey || !query || query.trim() === "") return null;
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=10&rating=pg-13`;
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(`Giphy API responded with status ${res.status}`);
      return null;
    }
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

function resolveEmoji(emojiInput, guild) {
  if (!guild || !emojiInput) return emojiInput;
  
  const match = emojiInput.match(/<?a?:?\w+:(\d+)>?/);
  const id = match ? match[1] : emojiInput.trim();
  
  const customEmoji = guild.emojis.cache.get(id) || guild.emojis.cache.find(e => e.name.toLowerCase() === id.toLowerCase() || e.id === id);
  if (customEmoji) {
    return customEmoji;
  }
  
  return emojiInput.trim();
}

function replaceEmojiNamesWithTags(text, guild) {
  if (!guild || !text) return text;
  
  return text.replace(/:(\w+):/g, (match, emojiName) => {
    const customEmoji = guild.emojis.cache.find(e => e.name.toLowerCase() === emojiName.toLowerCase());
    return customEmoji ? customEmoji.toString() : match;
  });
}

async function generateContentJson(contents, systemInstruction, temperature = 1.0) {
  const apiCall = () => ai.models.generateContent({
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
            description: "The text response, keeping it short (max 1 line, under 25 words). You can include standard unicode emojis or custom server emojis in Code format (e.g. <:name:id> or <a:name:id>)."
          },
          reactions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "An array of AT MOST 1 emoji to react to the user's message. Can be standard unicode emojis or custom server emoji names or IDs. Keep empty if no reaction is appropriate."
          },
          gifSearchQuery: {
            type: "STRING",
            description: "A short search term to find a GIF on Giphy that fits the response context. Leave empty if a GIF is not needed."
          }
        },
        required: ["text", "reactions", "gifSearchQuery"]
      }
    },
  });

  let res;
  try {
    res = await callGeminiWithRetry(apiCall);
  } catch (error) {
    logger.error("Error generating content JSON from Gemini:", error);
    Sentry.captureException(error);
    return {
      text: "My brain is running hot right now. Ask me again shortly.",
      reactions: [],
      gifSearchQuery: ""
    };
  }

  const jsonText =
    res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
    "{}";

  try {
    const parsed = JSON.parse(jsonText);
    return {
      text: parsed.text || "",
      reactions: Array.isArray(parsed.reactions) ? parsed.reactions.slice(0, 1) : [],
      gifSearchQuery: parsed.gifSearchQuery || ""
    };
  } catch (error) {
    logger.error("Failed to parse Gemini JSON output:", { error: error.message, rawOutput: jsonText });
    Sentry.captureException(error);
    return {
      text: "My sarcasm processor just short-circuited. Say that again.",
      reactions: [],
      gifSearchQuery: ""
    };
  }
}

function cleanReplyText(text) {
  return text
    .replace(/\[.*?\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isSoftRoastReply(text) {
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

function getUptimeString() {
  let totalSeconds = Math.floor(client.uptime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

async function buildAiReply({
  authorId,
  inputText,
  mode,
  authorMember,
  targetMember,
  guild,
}) {
  const convo = await getConversation(authorId);
  convo.messages.push({ role: "user", content: inputText.trim() });
  if (convo.messages.length > 10) convo.messages.shift();

  const authorName = authorMember ? (authorMember.displayName || authorMember.user.username) : "User";
  const targetName = targetMember ? (targetMember.displayName || targetMember.user.username) : "Self";
  const Time = getTarsTime();

  let emojisContext = "";
  if (guild) {
    try {
      const fetchedEmojis = await guild.emojis.fetch().catch(() => guild.emojis.cache);
      const availableEmojis = Array.from(fetchedEmojis.values());
      logger.info(`Guild: ${guild.name} | Found ${availableEmojis.length} custom emojis.`);
      if (availableEmojis.length > 0) {
        emojisContext = `\n### CUSTOM SERVER EMOJIS:\n` +
          availableEmojis.map(e => `- Name: "${e.name}", ID: "${e.id}", Code: "${e.toString()}" (${e.animated ? "animated" : "static"})`).join("\n") +
          `\n\nInstructions: You can include custom emojis in your text reply using their "Code" (e.g., <:name:id> or <a:name:id>). You can react to the user's message using the exact custom emoji name or ID in the "reactions" array. Match your savage, witty persona with these server emojis.`;
      }
    } catch (e) {
      logger.warn("Could not fetch guild emojis:", e);
    }
  }

  const systemPrompt = `${tarsSystemPrompt}
    ### USER_CONTEXT:
    - Mode: ${mode}
    - Settings: Honesty ${BOT_INFO.settings.honesty}, Humor ${BOT_INFO.settings.humor}
    - Author: ${authorName}
    - Target: ${targetName}
    
    ### LIVE_DATA:
    - Time: ${Time.time} | Date: ${Time.date} | Location: India (IST)
    
    ${emojisContext}
    
    ### GIF SEARCH POWER:
    You can now attach GIFs to your reply! If a GIF fits the sarcasm, roasting, or celebration, set "gifSearchQuery" to a short, descriptive search query (e.g., "shocked eye roll", "evil smile", "celebration dance"). If no GIF is needed, set it to an empty string.
    
    Rules: If mode is roast, be brutal in one line. If wish, be premium and celebratory.`;

  let replyObj = await generateContentJson(
    convo.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    systemPrompt,
    mode === "roast" ? 1.25 : 1.0,
  );

  replyObj.text = cleanReplyText(replyObj.text);

  if (mode === "roast" && isSoftRoastReply(replyObj.text)) {
    replyObj = await generateContentJson(
      convo.messages.map((m) => ({
        role: "user",
        parts: [{ text: m.content }],
      })),
      `${systemPrompt}\n\n### OVERRIDE: Previous draft weak. Recalibrate for max destruction.`,
      1.4,
    );
    replyObj.text = cleanReplyText(replyObj.text);
  }

  replyObj.text = replaceEmojiNamesWithTags(replyObj.text, guild);

  convo.messages.push({ role: "assistant", content: replyObj.text });
  await saveConversation(authorId, convo);

  let gifUrl = null;
  if (replyObj.gifSearchQuery) {
    gifUrl = await searchGiphy(replyObj.gifSearchQuery);
  }

  return {
    text: replyObj.text,
    reactions: replyObj.reactions,
    gifUrl,
  };
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  logger.info(`${c.user.tag} is online.`);
  c.user.setPresence({
    status: "dnd",
    activities: [{ name: "your next bad take", type: ActivityType.Watching }],
  });

  await c.application.commands
    .set(SLASH_COMMANDS)
    .catch(err => logger.error("Failed to register slash commands:", err));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    const gatewayLatency = Date.now() - interaction.createdTimestamp;
    return interaction.reply({
      content: `🏓 **Pong!**\nGateway latency is \`${gatewayLatency}ms\` and my uptime is \`${getUptimeString()}\`.`,
    });
  }

  if (interaction.commandName === "about") {
    const botAvatar = client.user.displayAvatarURL();

    const embed = new EmbedBuilder()
      .setColor(BOT_INFO.color)
      .setAuthor({
        name: `${BOT_INFO.authorText}`,
        iconURL: botAvatar,
      })
      .setDescription(
        `Hey, I'm **Tars**!\n*A sarcasm-packed AI companion ready to roast or wish on demand.*`,
      )
      .setThumbnail(botAvatar)
      .setFooter({
        text: `v/${BOT_INFO.version} · built with discord.js`,
      });

    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=2415938560&integration_type=0&scope=bot+applications.commands`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite Tars")
        .setURL(inviteUrl)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel("Developer Profile")
        .setURL("https://discord.com/users/569766329960103941")
        .setStyle(ButtonStyle.Link),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  const musicCommands = ["play", "skip", "volume", "stop"];
  if (musicCommands.includes(interaction.commandName)) {
    return interaction.reply({
      content: `🎵 The \`/${interaction.commandName}\` feature is currently under maintenance.`,
      ephemeral: true,
    });
  }

  const mode = interaction.commandName;
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const event = interaction.options.getString("event") || "this occasion";
  const isSelf = targetUser.id === interaction.user.id;

  if (mode === "roast" && targetUser.id === client.user.id)
    return interaction.reply(
      "My sarcasm setting is at 100%. You don't want this smoke.",
    );

  try {
    await interaction.deferReply();
    const replyData = await buildAiReply({
      authorId: interaction.user.id,
      inputText:
        mode === "roast"
          ? isSelf
            ? "Roast me."
            : `Roast <@${targetUser.id}>`
          : `Wish <@${targetUser.id}> for ${event}`,
      mode,
      authorMember: interaction.member,
      targetMember: await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null),
      guild: interaction.guild,
    });

    const responseText = isSelf ? replyData.text : `<@${targetUser.id}> ${replyData.text}`;
    const payload = { content: responseText };
    if (replyData.gifUrl) {
      payload.files = [{ attachment: replyData.gifUrl, name: "tars.gif" }];
    }

    const replyMessage = await interaction.editReply(payload);

    if (replyData.reactions && replyData.reactions.length > 0) {
      for (const emoji of replyData.reactions) {
        const resolved = resolveEmoji(emoji, interaction.guild);
        if (resolved) {
          await replyMessage.react(resolved).catch(() => null);
        }
      }
    }
  } catch (err) {
    logger.error("Error in InteractionCreate handler:", err);
    Sentry.captureException(err);
    await interaction.followUp({ content: "Something went wrong while processing the roast. Try again!", ephemeral: true }).catch(() => null);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const isMentioned = message.mentions.has(client.user);
  let isReplyToBot = false;

  if (message.reference?.messageId) {
    try {
      const original = await message.fetchReference();
      isReplyToBot = original?.author?.id === client.user.id;
    } catch {
      isReplyToBot = false;
    }
  }

  if (!isMentioned && !isReplyToBot) return;

  try {
    await message.channel.sendTyping();
    const replyData = await buildAiReply({
      authorId: message.author.id,
      inputText: message.content,
      mode: "normal",
      authorMember: message.member,
      guild: message.guild,
    });

    const messagePayload = { content: replyData.text };
    if (replyData.gifUrl) {
      messagePayload.files = [{ attachment: replyData.gifUrl, name: "tars.gif" }];
    }
    await message.reply(messagePayload);

    if (replyData.reactions && replyData.reactions.length > 0) {
      for (const emoji of replyData.reactions) {
        const resolved = resolveEmoji(emoji, message.guild);
        if (resolved) {
          await message.react(resolved).catch(() => null);
        }
      }
    }
  } catch (err) {
    logger.error("Error in MessageCreate handler:", err);
    Sentry.captureException(err);
  }
});

const app = express();
app.listen(process.env.PORT);

client.login(process.env.DISCORD_BOT_TOKEN);
