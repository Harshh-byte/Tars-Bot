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
import { showLeaderboard } from "./leaderboard.js";

let cachedFlagCountries = null;
const recentFlagsMap = new Map();
const channelSkipsMap = new Map();
const channelSessionScoresMap = new Map();
const activeCollectorsMap = new Map();
const activeHintTimersMap = new Map();

const EASY_CODES = new Set([
  "us",
  "ca",
  "gb",
  "fr",
  "de",
  "it",
  "es",
  "jp",
  "cn",
  "in",
  "br",
  "ar",
  "au",
  "mx",
  "kr",
  "ru",
  "eg",
  "my",
  "tr",
  "ch",
  "gr",
  "za",
  "se",
  "nl",
  "pt",
  "id",
  "sa",
  "sg",
  "th",
  "ph",
  "vn",
  "nz",
  "ie",
  "no",
  "fi",
  "dk",
  "be",
  "at",
  "pl",
  "ua",
  "cl",
  "co",
  "pe",
  "pk",
  "bd",
  "ae",
  "qa",
  "jm",
  "np",
  "is",
  "ma",
  "ng",
  "cu",
  "uy",
]);

const MEDIUM_CODES = new Set([
  "ro",
  "hu",
  "cz",
  "hr",
  "ke",
  "kw",
  "bh",
  "om",
  "dz",
  "tn",
  "lk",
  "kh",
  "la",
  "mm",
  "iq",
  "ir",
  "sy",
  "jo",
  "lb",
  "ge",
  "am",
  "az",
  "uz",
  "kz",
  "cy",
  "mt",
  "lu",
  "ee",
  "lv",
  "lt",
  "sk",
  "si",
  "bg",
  "by",
  "rs",
  "ba",
  "me",
  "mk",
  "al",
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
    ...code
      .toUpperCase()
      .split("")
      .map((c) => base + c.charCodeAt(0)),
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
          matrix[i - 1][j] + 1,
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

function getRevealedHint(name, revealedIndices = new Set()) {
  const words = name.split(" ");
  let globalIndex = 0;

  return words
    .map((word) => {
      const chars = word.split("");
      const wordStr = chars
        .map((char) => {
          const idx = globalIndex++;
          if (!/[a-zA-Z]/.test(char)) return char;
          if (revealedIndices.has(idx)) {
            return char.toUpperCase();
          }
          return "`_`";
        })
        .join(" ");
      return wordStr;
    })
    .join("   ");
}

function getAliases(name, code) {
  const lowerName = name.toLowerCase();
  const aliases = new Set([lowerName]);

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
        return cachedFlagCountries;
      }
    }
  } catch (err) {
    logger.warn(`Flag API fetch failed: ${err.message}`);
  }

  return [
    {
      name: "Malaysia",
      code: "my",
      emoji: "🇲🇾",
      difficulty: "Easy",
      aliases: ["malaysia"],
    },
    {
      name: "Japan",
      code: "jp",
      emoji: "🇯🇵",
      difficulty: "Easy",
      aliases: ["japan"],
    },
    {
      name: "United States",
      code: "us",
      emoji: "🇺🇸",
      difficulty: "Easy",
      aliases: ["united states"],
    },
    {
      name: "France",
      code: "fr",
      emoji: "🇫🇷",
      difficulty: "Easy",
      aliases: ["france"],
    },
    {
      name: "Germany",
      code: "de",
      emoji: "🇩🇪",
      difficulty: "Easy",
      aliases: ["germany"],
    },
    {
      name: "India",
      code: "in",
      emoji: "🇮🇳",
      difficulty: "Easy",
      aliases: ["india"],
    },
    {
      name: "Brazil",
      code: "br",
      emoji: "🇧🇷",
      difficulty: "Easy",
      aliases: ["brazil"],
    },
  ];
}

function getUnusedCountry(filteredCountries, channelId) {
  if (!recentFlagsMap.has(channelId)) {
    recentFlagsMap.set(channelId, []);
  }

  const recentList = recentFlagsMap.get(channelId);
  const available = filteredCountries.filter(
    (c) => !recentList.includes(c.code),
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
      .setLabel("Play Again")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("show_lb_flag")
      .setLabel("Leaderboard")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  const rawArgs = (
    interaction.options?.getString("difficulty") ||
    interaction.options?.getString("getString") ||
    ""
  ).toLowerCase();

  let difficultyInput = interaction.options
    ?.getString("difficulty")
    ?.toLowerCase();
  if (!difficultyInput) {
    if (rawArgs.includes("hard")) difficultyInput = "hard";
    else if (rawArgs.includes("medium") || rawArgs.includes("med"))
      difficultyInput = "medium";
    else if (rawArgs.includes("easy")) difficultyInput = "easy";
  }

  return startFlagGame(
    interaction,
    client,
    false,
    difficultyInput,
    buildAiReply,
  );
}

async function startFlagGame(
  interaction,
  client,
  isFollowUp = false,
  selectedDifficulty,
  buildAiReply,
) {
  try {
    const allCountries = await fetchCountriesFromApi();
    const channelId =
      interaction.channelId || interaction.channel?.id || "default";

    if (activeCollectorsMap.has(channelId)) {
      const oldCollector = activeCollectorsMap.get(channelId);
      if (oldCollector && !oldCollector.ended) {
        oldCollector.stop("superceded");
      }
      activeCollectorsMap.delete(channelId);
    }
    if (activeHintTimersMap.has(channelId)) {
      clearTimeout(activeHintTimersMap.get(channelId));
      activeHintTimersMap.delete(channelId);
    }

    if (!isFollowUp) {
      channelSkipsMap.set(channelId, 0);
    }

    let filteredCountries = allCountries;
    if (selectedDifficulty) {
      const targetDiff = selectedDifficulty.toLowerCase();
      filteredCountries = allCountries.filter(
        (c) => c.difficulty.toLowerCase() === targetDiff,
      );
      if (filteredCountries.length === 0) filteredCountries = allCountries;
    } else {
      const rand = Math.random();
      const targetDiff = rand < 0.7 ? "easy" : rand < 0.95 ? "medium" : "hard";
      const matches = allCountries.filter(
        (c) => c.difficulty.toLowerCase() === targetDiff,
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

    const diffBadge = targetCountry.difficulty;

    const revealedIndices = new Set();
    const letterIndices = [];
    let isFirstLetter = true;
    targetCountry.name.split("").forEach((char, idx) => {
      if (/[a-zA-Z]/.test(char)) {
        letterIndices.push(idx);
        if (isFirstLetter) {
          revealedIndices.add(idx);
          isFirstLetter = false;
        }
      } else if (char === " ") {
        isFirstLetter = true;
      }
    });

    let hintClicks = 0;
    const maxHintClicks = 1;

    const buildPromptPayload = (currentHint) => ({
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.INFO,
          components: [
            {
              type: 10,
              content: `### 🗺️ Guess the Country!`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content:
                `**Difficulty:** ${diffBadge}\n` +
                `**Country:** ${currentHint}\n\n` +
                `-# You have 30 seconds to guess!\n` +
                `-# Hint Penalty: -5 pts`,
            },
            {
              type: 12,
              items: [
                {
                  media: {
                    url: flagUrl,
                  },
                },
              ],
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 1,
              components: [
                hintClicks >= maxHintClicks
                  ? {
                      type: 2,
                      style: 2,
                      custom_id: "flag_hint",
                      label: "Hint Revealed",
                      disabled: true,
                    }
                  : {
                      type: 2,
                      style: 2,
                      custom_id: "flag_hint",
                      label: "Get Hint",
                    },
                {
                  type: 2,
                  style: 4,
                  custom_id: "flag_skip",
                  label: "Skip",
                },
              ],
            },
          ],
        },
      ],
    });

    const payload = buildPromptPayload(getRevealedHint(targetCountry.name, revealedIndices));

    const channel = interaction.channel;
    if (!channel || typeof channel.createMessageCollector !== "function")
      return;

    let response;
    if (isFollowUp) {
      response = await channel.send(payload);
    } else if (interaction.deferred || interaction.replied) {
      response = await channel.send(payload);
    } else {
      await interaction.reply(payload);
      response = await interaction.fetchReply();
    }

    const filter = (m) => !m.author.bot;
    const collector = channel.createMessageCollector({ filter, time: 30000 });
    activeCollectorsMap.set(channelId, collector);

    const btnCollector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    btnCollector.on("collect", async (bInt) => {
      if (bInt.customId === "flag_hint") {
        if (hintClicks >= maxHintClicks) {
          return bInt
            .reply({
              content: "Maximum hints already revealed for this flag!",
              flags: 64,
            })
            .catch(() => null);
        }

        const unrevealed = letterIndices.filter((idx) => !revealedIndices.has(idx));
        if (unrevealed.length > 0) {
          // Reveal 1 to 2 random unrevealed letters
          const revealAmount = Math.min(unrevealed.length, Math.ceil(unrevealed.length * 0.4));
          for (let i = 0; i < revealAmount; i++) {
            const randomIndex = Math.floor(Math.random() * unrevealed.length);
            const chosen = unrevealed.splice(randomIndex, 1)[0];
            revealedIndices.add(chosen);
          }
        }
        hintClicks++;

        const updatedHint = getRevealedHint(targetCountry.name, revealedIndices);
        await bInt.update(buildPromptPayload(updatedHint)).catch(() => null);
      } else if (bInt.customId === "flag_skip") {
        const currentSkips = channelSkipsMap.get(channelId) || 0;
        if (currentSkips >= 5) {
          return bInt
            .reply({
              content:
                "<:Warning:1526228248458035381> **Maximum skips reached!** You must guess this flag or wait for the timer.",
              flags: 64,
            })
            .catch(() => null);
        }

        channelSkipsMap.set(channelId, currentSkips + 1);
        collector.stop("skipped");
        btnCollector.stop("skipped");
        await bInt.deferUpdate().catch(() => null);
      }
    });

    let winnerMessage = null;
    const closeMatchUsers = new Set();

    collector.on("collect", async (m) => {
      const input = m.content.trim().toLowerCase();

      const isCorrect = targetCountry.aliases.some(
        (alias) => alias.toLowerCase() === input,
      );

      if (isCorrect) {
        winnerMessage = m;
        collector.stop("correct");
        await m
          .react("1526228339910643793")
          .catch(() =>
            m
              .react("<:Success:1526228339910643793>")
              .catch(() => m.react("✅").catch(() => null)),
          );
      } else if (isCloseMatch(input, targetCountry.aliases)) {
        if (!closeMatchUsers.has(m.author.id)) {
          closeMatchUsers.add(m.author.id);
          await m.channel
            .send({
              content: `<@${m.author.id}> You're so close! Check for typos!`,
              allowedMentions: { users: [m.author.id], parse: ["users"] },
            })
            .catch(() => null);
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (activeCollectorsMap.get(channelId) === collector) {
        activeCollectorsMap.delete(channelId);
      }

      if (reason === "superceded") return;

      try {
        if (reason === "skipped") {
          const currentSkips = channelSkipsMap.get(channelId) || 1;
          const remainingSkips = Math.max(0, 5 - currentSkips);

          await channel.send({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.WARNING,
                components: [
                  {
                    type: 10,
                    content: `### Flag Skipped!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `The country was **${targetCountry.name}** ${targetCountry.emoji}.\n\n` +
                      `-# Skips remaining: ${remainingSkips}/5`,
                  },
                ],
              },
            ],
          });

          setTimeout(async () => {
            await startFlagGame(
              interaction,
              client,
              true,
              selectedDifficulty,
              buildAiReply,
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
          const currentSessionScore =
            (channelSessionScoresMap.get(channelId) || 0) + pointsGained;
          channelSessionScoresMap.set(channelId, currentSessionScore);

          await channel.send({
            flags: 32768,
            allowedMentions: { parse: [] },
            allowed_mentions: { parse: [] },
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.SUCCESS,
                components: [
                  {
                    type: 10,
                    content: `### <a:Tada:1544329561955770488> Correct Guess!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `${winnerMention} guessed it right!\n` +
                      `The country was **${targetCountry.name}** ${targetCountry.emoji}!\n\n` +
                      `🏆 **+${pointsGained} Points** • **Total: ${scoreData.totalPoints}** Pts`,
                  },
                ],
              },
            ],
          });

          setTimeout(async () => {
            await startFlagGame(
              interaction,
              client,
              true,
              selectedDifficulty,
              buildAiReply,
            );
          }, 1500);
        } else {
          channelSkipsMap.set(channelId, 0);
          channelSessionScoresMap.set(channelId, 0);

          const resultMsg = await channel.send({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.TIMEOUT,
                components: [
                  {
                    type: 10,
                    content: `### ⌛ Time's Up!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `Nobody guessed the country in time!\n\n` +
                      `The correct answer was **${targetCountry.name}** ${targetCountry.emoji}.`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 1,
                        custom_id: "flag_next",
                        label: "Play Again",
                      },
                      {
                        type: 2,
                        style: 2,
                        custom_id: "show_lb_flag",
                        label: "Leaderboard",
                        emoji: { name: "🏆" },
                      },
                    ],
                  },
                ],
              },
            ],
          });

          attachFlagNextCollector(
            resultMsg,
            interaction,
            client,
            selectedDifficulty,
            buildAiReply,
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
  buildAiReply,
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

      if (btnInteraction.customId === "flag_next") {
        buttonCollector.stop("clicked");
        if (btnInteraction.message && btnInteraction.message.components) {
          const disabledRows = btnInteraction.message.components.map((row) => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach((comp) => {
              if (comp.data.custom_id === "flag_next") {
                comp.setDisabled(true);
              }
            });
            return newRow;
          });
          await btnInteraction
            .update({ components: disabledRows })
            .catch(() => null);
        } else {
          await btnInteraction.deferUpdate().catch(() => null);
        }

        channelSkipsMap.set(channelId, 0);
        channelSessionScoresMap.set(channelId, 0);

        await startFlagGame(
          btnInteraction,
          client,
          true,
          extraSetting,
          buildAiReply,
        );
      } else if (btnInteraction.customId === "show_lb_flag") {
        await showLeaderboard(btnInteraction, client, "flag");
      }
    } catch (err) {
      logger.error("Error in flag button execution:", err);
    }
  });
}
