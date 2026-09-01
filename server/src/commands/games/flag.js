import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { addFlagScore } from "../../services/database.js";
import { showLeaderboard } from "./guessboard.js";

let cachedFlagCountries = null;
const recentFlagsMap = new Map();
const channelSkipsMap = new Map();

const EASY_CODES = new Set([
  "us", "ca", "gb", "fr", "de", "it", "es", "jp", "cn", "in", "br", "ar", "au",
  "mx", "kr", "ru", "eg", "my", "tr", "ch", "gr", "za", "se", "nl", "pt", "id", "sa",
  "sg", "th", "ph", "vn", "nz", "ie", "no", "fi", "dk", "be", "at", "pl", "ua", "cl",
  "co", "pe", "pk", "bd", "ae", "qa", "jm", "np", "is", "ma", "ng", "cu", "uy"
]);

const MEDIUM_CODES = new Set([
  "ro", "hu", "cz", "hr", "ke", "kw", "bh", "om", "dz", "tn", "lk", "kh", "la",
  "mm", "iq", "ir", "sy", "jo", "lb", "ge", "am", "az", "uz", "kz", "cy", "mt",
  "lu", "ee", "lv", "lt", "sk", "si", "bg", "by", "rs", "ba", "me", "mk", "al"
]);

function getDifficulty(code) {
  const lower = code.toLowerCase();
  if (EASY_CODES.has(lower)) return "Easy";
  if (MEDIUM_CODES.has(lower)) return "Medium";
  return "Hard";
}

function getBasePoints(difficulty) {
  if (difficulty === "Easy") return 10;
  if (difficulty === "Medium") return 20;
  return 30;
}

function codeToEmoji(code) {
  if (!code || code.length !== 2) return "🚩";
  const base = 127397;
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => base + c.charCodeAt(0))
  );
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isCloseMatch(input, targetAliases) {
  if (!input || input.length < 3) return false;
  return targetAliases.some((alias) => {
    const cleanAlias = alias.toLowerCase();
    const distance = levenshteinDistance(input, cleanAlias);
    const maxAllowedDist =
      cleanAlias.length > 7 ? 2 : cleanAlias.length > 4 ? 1 : 0;
    return distance > 0 && distance <= maxAllowedDist;
  });
}

function generateHint(name, level = 0) {
  const chars = name.split("");
  const totalLetters = chars.filter((c) => /[a-zA-Z]/.test(c)).length;
  const revealCount =
    level === 0
      ? 1
      : Math.min(totalLetters - 1, Math.floor(totalLetters * 0.4) + level);

  let revealed = 0;
  return chars
    .map((char, i) => {
      if (!/[a-zA-Z]/.test(char)) return char;
      if (i === 0 || (revealed < revealCount && Math.random() < 0.6)) {
        revealed++;
        return `**${char.toUpperCase()}**`;
      }
      return "`_`";
    })
    .join(" ");
}

function getAliases(name, code) {
  const lowerName = name.toLowerCase();
  const aliases = new Set([lowerName, code.toLowerCase()]);

  if (lowerName === "united states" || lowerName === "united states of america") {
    aliases.add("usa");
    aliases.add("us");
    aliases.add("america");
  } else if (lowerName === "united kingdom") {
    aliases.add("uk");
    aliases.add("britain");
    aliases.add("england");
  } else if (lowerName === "united arab emirates") {
    aliases.add("uae");
    aliases.add("emirates");
  } else if (lowerName === "south korea" || lowerName === "republic of korea") {
    aliases.add("korea");
    aliases.add("south korea");
  } else if (lowerName === "north korea") {
    aliases.add("north korea");
  } else if (lowerName === "netherlands") {
    aliases.add("holland");
  } else if (lowerName === "russian federation") {
    aliases.add("russia");
  }

  const cleanName = lowerName.replace(/\(.*?\)/g, "").trim();
  if (cleanName) aliases.add(cleanName);

  return Array.from(aliases);
}

async function fetchCountriesFromApi() {
  if (cachedFlagCountries && cachedFlagCountries.length > 0) {
    return cachedFlagCountries;
  }

  try {
    const res = await fetch("https://flagcdn.com/en/codes.json");
    if (res.ok) {
      const data = await res.json();
      const countries = [];

      for (const [code, name] of Object.entries(data)) {
        if (
          code.length === 2 &&
          !code.startsWith("us-") &&
          !code.startsWith("gb-")
        ) {
          const emoji = codeToEmoji(code);
          const aliases = getAliases(name, code);
          const difficulty = getDifficulty(code);
          countries.push({
            code,
            name,
            emoji,
            aliases,
            difficulty,
          });
        }
      }

      if (countries.length > 0) {
        cachedFlagCountries = countries;
        return cachedCountries;
      }
    }
  } catch (err) {
    logger.warn(`Flag API fetch failed: ${err.message}`);
  }

  return [
    { name: "Malaysia", code: "my", emoji: "🇲🇾", difficulty: "Easy", aliases: ["malaysia"] },
    { name: "Japan", code: "jp", emoji: "🇯🇵", difficulty: "Easy", aliases: ["japan"] },
    { name: "United States", code: "us", emoji: "🇺🇸", difficulty: "Easy", aliases: ["united states", "usa", "us", "america"] },
    { name: "France", code: "fr", emoji: "🇫🇷", difficulty: "Easy", aliases: ["france"] },
    { name: "Germany", code: "de", emoji: "🇩🇪", difficulty: "Easy", aliases: ["germany"] },
    { name: "India", code: "in", emoji: "🇮🇳", difficulty: "Easy", aliases: ["india"] },
    { name: "Brazil", code: "br", emoji: "🇧🇷", difficulty: "Easy", aliases: ["brazil"] },
  ];
}

function getUnusedCountry(filteredCountries, channelId) {
  if (!recentFlagsMap.has(channelId)) {
    recentFlagsMap.set(channelId, []);
  }

  const recentList = recentFlagsMap.get(channelId);
  const available = filteredCountries.filter(
    (c) => !recentList.includes(c.code)
  );

  const pool = available.length > 0 ? available : filteredCountries;
  const selected = pool[Math.floor(Math.random() * pool.length)];

  recentList.push(selected.code);
  if (recentList.length > 30) {
    recentList.shift();
  }

  return selected;
}

export const aliases = ["guessflag"];

export const data = {
  name: "flag",
  description: "Guess the country by its flag.",
  dm_permission: false,
  options: [
    {
      name: "difficulty",
      description: "Difficulty",
      type: 3,
      required: false,
      choices: [
        { name: "Easy", value: "easy" },
        { name: "Medium", value: "medium" },
        { name: "Hard", value: "hard" },
      ],
    },
  ],
};

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("flag_next")
      .setLabel("Next Flag")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("show_lb_flag")
      .setLabel("Leaderboard")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Secondary)
  );
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  const rawArgs = (
    interaction.options?.getString("difficulty") ||
    interaction.options?.getString("getString") ||
    ""
  ).toLowerCase();

  let difficultyInput = interaction.options?.getString("difficulty")?.toLowerCase();
  if (!difficultyInput) {
    if (rawArgs.includes("hard")) difficultyInput = "hard";
    else if (rawArgs.includes("medium") || rawArgs.includes("med")) difficultyInput = "medium";
    else if (rawArgs.includes("easy")) difficultyInput = "easy";
  }

  return startFlagGame(interaction, client, false, difficultyInput, buildAiReply);
}

async function startFlagGame(
  interaction,
  client,
  isFollowUp = false,
  selectedDifficulty,
  buildAiReply
) {
  try {
    const allCountries = await fetchCountriesFromApi();
    const channelId = interaction.channelId || interaction.channel?.id || "default";

    let filteredCountries = allCountries;
    if (selectedDifficulty) {
      const targetDiff = selectedDifficulty.toLowerCase();
      filteredCountries = allCountries.filter(
        (c) => c.difficulty.toLowerCase() === targetDiff
      );
      if (filteredCountries.length === 0) filteredCountries = allCountries;
    } else {
      const rand = Math.random();
      const targetDiff = rand < 0.7 ? "easy" : rand < 0.95 ? "medium" : "hard";
      const matches = allCountries.filter(
        (c) => c.difficulty.toLowerCase() === targetDiff
      );
      if (matches.length > 0) filteredCountries = matches;
    }

    const targetCountry = getUnusedCountry(filteredCountries, channelId);

    const userDisplayName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;
    const userAvatar = interaction.user.displayAvatarURL({
      extension: "png",
      size: 256,
    });
    const flagUrl = `https://flagcdn.com/w320/${targetCountry.code}.png`;
    const initialHint = generateHint(targetCountry.name, 0);

    const diffBadge = targetCountry.difficulty;

    const embed = new EmbedBuilder()
      .setAuthor({ name: userDisplayName, iconURL: userAvatar })
      .setTitle("Guess the Flag!")
      .setThumbnail(flagUrl)
      .setDescription(
        `**Difficulty:** ${diffBadge}\n` +
          `**Hint:** ${initialHint}\n\n` +
          `You have 30 seconds to guess the country.\n` +
          `*Type your answer in the chat or \`.skip\` to skip.*`
      )
      .setColor(EMBED_COLORS.GREY);

    const payload = { embeds: [embed], components: [] };

    const channel = interaction.channel;
    if (!channel || typeof channel.createMessageCollector !== "function") return;

    let response;
    if (isFollowUp) {
      response = await channel.send(payload);
    } else if (interaction.deferred || interaction.replied) {
      response = await channel.send(payload);
    } else {
      response = await interaction.reply({ ...payload, fetchReply: true });
    }

    const filter = (m) => !m.author.bot;
    const collector = channel.createMessageCollector({ filter, time: 30000 });

    let winnerMessage = null;
    const closeMatchUsers = new Set();

    const hintTimer = setTimeout(async () => {
      try {
        if (!collector.ended) {
          const secondHint = generateHint(targetCountry.name, 1);
          const updatedEmbed = EmbedBuilder.from(embed).setDescription(
            `**Difficulty:** ${diffBadge}\n` +
              `**Hint:** ${secondHint}\n\n` +
              `You have 30 seconds to guess the country.\n` +
              `*Type your answer in the chat or \`.skip\` to skip.*`
          );
          if (response && typeof response.edit === "function") {
            await response.edit({ embeds: [updatedEmbed] }).catch(() => null);
          }
        }
      } catch {}
    }, 12000);

    collector.on("collect", async (m) => {
      const input = m.content.trim().toLowerCase();

      if (input === ".skip" || input === ".s") {
        const skipsUsed = channelSkipsMap.get(channelId) || 0;
        if (skipsUsed >= 5) {
          await m
            .reply({
              content:
                "⚠️ **Maximum skips reached (5/5)!** You must guess this flag or wait for the timer.",
            })
            .catch(() => null);
          return;
        }

        channelSkipsMap.set(channelId, skipsUsed + 1);
        clearTimeout(hintTimer);
        collector.stop("skipped");
        await m.react("⏩").catch(() => null);
        return;
      }

      const isCorrect = targetCountry.aliases.some(
        (alias) => alias.toLowerCase() === input
      );

      if (isCorrect) {
        winnerMessage = m;
        clearTimeout(hintTimer);
        collector.stop("correct");
        await m
          .react("1526228339910643793")
          .catch(() =>
            m
              .react("<:Success:1526228339910643793>")
              .catch(() => m.react("✅").catch(() => null))
          );
      } else if (isCloseMatch(input, targetCountry.aliases)) {
        if (!closeMatchUsers.has(m.author.id)) {
          closeMatchUsers.add(m.author.id);
          await m
            .reply({
              content: `*<@${m.author.id}>, you're so close! Check for typos!*`,
            })
            .catch(() => null);
        }
      }
    });

    collector.on("end", async (_, reason) => {
      clearTimeout(hintTimer);
      try {
        if (reason === "skipped") {
          const currentSkips = channelSkipsMap.get(channelId) || 1;
          const remainingSkips = Math.max(0, 5 - currentSkips);

          const skipEmbed = new EmbedBuilder()
            .setTitle("**Flag Skipped!**")
            .setDescription(
              `The country was **${targetCountry.name}** ${targetCountry.emoji}.\n\n` +
                `*Skips remaining for this game:* **${remainingSkips}/5**`
            )
            .setColor(EMBED_COLORS.WARNING);

          await channel.send({ embeds: [skipEmbed] });

          setTimeout(async () => {
            await startFlagGame(
              interaction,
              client,
              true,
              selectedDifficulty,
              buildAiReply
            );
          }, 1500);
        } else if (reason === "correct" && winnerMessage) {
          const winnerId = winnerMessage.author.id;
          const serverId = interaction.guild?.id || "DM";

          const pointsGained = getBasePoints(targetCountry.difficulty);

          let scoreData = { totalPoints: pointsGained, totalWins: 1 };
          if (serverId !== "DM") {
            scoreData = await addFlagScore(serverId, winnerId, pointsGained);
          }

          const winnerMention = `<@${winnerId}>`;
          const winEmbed = new EmbedBuilder()
            .setTitle("<a:Tada:1544329561955770488> **Correct Guess!**")
            .setDescription(
              `${winnerMention} guessed it right!\n` +
                `The country was **${targetCountry.name}** ${targetCountry.emoji}!\n\n` +
                `🏆 **+${pointsGained} Points** *(Total: **${scoreData.totalPoints}** Pts)*`
            )
            .setColor(EMBED_COLORS.SUCCESS);

          await channel.send({ embeds: [winEmbed] });

          setTimeout(async () => {
            await startFlagGame(
              interaction,
              client,
              true,
              selectedDifficulty,
              buildAiReply
            );
          }, 1500);
        } else {
          channelSkipsMap.set(channelId, 0);
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⌛ **Time's Up!**")
            .setDescription(
              `Nobody guessed the country in time!\n\n` +
                `The correct answer was **${targetCountry.name}** ${targetCountry.emoji}.`
            )
            .setColor(EMBED_COLORS.TIMEOUT);

          const resultMsg = await channel.send({
            embeds: [timeoutEmbed],
            components: [buildButtons()],
          });

          attachFlagNextCollector(
            resultMsg,
            interaction,
            client,
            selectedDifficulty,
            buildAiReply
          );
        }
      } catch (err) {
        logger.error("Error ending flag game collector:", err);
      }
    });
  } catch (err) {
    logger.error("Error in flag command execution:", err);
    Sentry.captureException(err);
  }
}

function attachFlagNextCollector(
  message,
  originalInteraction,
  client,
  extraSetting,
  buildAiReply
) {
  if (!message || typeof message.createMessageComponentCollector !== "function")
    return;

  const buttonCollector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 86400000,
  });

  buttonCollector.on("collect", async (btnInteraction) => {
    try {
      const channelId =
        btnInteraction.channelId || btnInteraction.channel?.id || "default";
      channelSkipsMap.set(channelId, 0);

      if (btnInteraction.customId === "flag_next") {
        await btnInteraction.deferUpdate();
        await startFlagGame(
          btnInteraction,
          client,
          true,
          extraSetting,
          buildAiReply
        );
      } else if (btnInteraction.customId === "show_lb_flag") {
        await showLeaderboard(btnInteraction, client, "flag");
      }
    } catch (err) {
      logger.error("Error in flag button execution:", err);
    }
  });
}
