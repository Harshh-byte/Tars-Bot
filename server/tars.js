import dotenv from "dotenv";
import { fileURLToPath } from "url";
dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });
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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MALE_ROLE_ID = "1283084809912193055";
const FEMALE_ROLE_IDS = ["1283084870431805561", "1494305758349889557"];

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

async function generateContent(contents, systemInstruction, temperature = 1.0) {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 250,
      temperature,
      tools: [{ googleSearch: {} }],
    },
  });

  const text =
    res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
    "";
  return text.replace(/\(user has.*?\)/gi, "").trim();
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

function createProgressBar(valueString) {
  const percent = parseInt(valueString) || 0;
  const progress = Math.round(percent / 10);
  const empty = 10 - progress;
  return `\`${"▰".repeat(progress)}${"▱".repeat(empty)}\` **${percent}%**`;
}

function getGenderMeta(member) {
  if (FEMALE_ROLE_IDS.some((id) => member?.roles?.cache?.has(id)))
    return {
      gender: "female",
      subject: "she",
      object: "her",
      possessive: "her",
    };
  if (member?.roles?.cache?.has(MALE_ROLE_ID))
    return { gender: "male", subject: "he", object: "him", possessive: "his" };
  return {
    gender: "unknown",
    subject: "they",
    object: "them",
    possessive: "their",
  };
}

function getToneProfile(member) {
  if (member?.roles?.cache?.has(MALE_ROLE_ID)) return "alpha-homie";
  if (FEMALE_ROLE_IDS.some((id) => member?.roles?.cache?.has(id)))
    return "smooth-dominant";
  return "neutral";
}

async function buildAiReply({
  authorId,
  inputText,
  mode,
  authorMember,
  targetMember,
}) {
  const convo = await getConversation(authorId);
  convo.messages.push({ role: "user", content: inputText.trim() });
  if (convo.messages.length > 10) convo.messages.shift();

  const authorMeta = getGenderMeta(authorMember);
  const targetMeta = targetMember ? getGenderMeta(targetMember) : null;
  const Time = getTarsTime();

  const systemPrompt = `${tarsSystemPrompt}
    ### USER_CONTEXT:
    - Mode: ${mode} | Tone: ${getToneProfile(authorMember)}
    - Settings: Honesty ${BOT_INFO.settings.honesty}, Humor ${BOT_INFO.settings.humor}
    - Author: ${authorMeta.subject}/${authorMeta.object}
    - Target: ${targetMeta ? `${targetMeta.subject}/${targetMeta.object}` : "Self"}
    
    ### LIVE_DATA:
    - Time: ${Time.time} | Date: ${Time.date} | Location: India (IST)
    
    Rules: If mode is roast, be brutal in one line. If wish, be premium and celebratory.`;

  let text = await generateContent(
    convo.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    systemPrompt,
    mode === "roast" ? 1.25 : 1.0,
  );

  text = cleanReplyText(text);

  if (mode === "roast" && isSoftRoastReply(text)) {
    text = await generateContent(
      convo.messages.map((m) => ({
        role: "user",
        parts: [{ text: m.content }],
      })),
      `${systemPrompt}\n\n### OVERRIDE: Previous draft weak. Recalibrate for max destruction.`,
      1.4,
    );
  }

  convo.messages.push({ role: "assistant", content: cleanReplyText(text) });
  await saveConversation(authorId, convo);
  return cleanReplyText(text);
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
  console.log(`🤖 ${c.user.tag} is online.`);
  c.user.setPresence({
    status: "dnd",
    activities: [{ name: "your next bad take", type: ActivityType.Watching }],
  });

  await c.application.commands
    .set(SLASH_COMMANDS)
    .catch(console.error);
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
      .addFields({
        name: "🧬 Cognitive Core Parameters",
        value: [
          `• **Honesty:** ${createProgressBar(BOT_INFO.settings.honesty)}`,
          `• **Humor:** ${createProgressBar(BOT_INFO.settings.humor)}`,
          `• **Discretion:** ${createProgressBar(BOT_INFO.settings.discretion)}`,
        ].join("\n"),
        inline: false,
      })
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

  await interaction.deferReply();
  const text = await buildAiReply({
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
  });

  await interaction.editReply({
    content: isSelf ? text : `<@${targetUser.id}> ${text}`,
  });
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

  await message.channel.sendTyping();
  const text = await buildAiReply({
    authorId: message.author.id,
    inputText: message.content,
    mode: "normal",
    authorMember: message.member,
  });
  await message.reply(text).catch(() => null);
});

const app = express();
app.listen(process.env.PORT);

client.login(process.env.DISCORD_BOT_TOKEN);
