import { EMBED_COLORS } from "../../utils/embeds.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { addScrambleScore } from "../../services/database.js";

export const aliases = ["ws"];

export const data = {
  name: "scramble",
  description: "Unscramble the word!",
  dm_permission: false,
  options: [
    {
      name: "category",
      description: "Select word category",
      type: 3,
      required: false,
      choices: [
        { name: "General", value: "general" },
        { name: "Animals", value: "animals" },
        { name: "Tech", value: "tech" },
        { name: "Food", value: "food" },
        { name: "Countries", value: "countries" },
      ],
    },
    {
      name: "difficulty",
      description: "Select game difficulty",
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

const activeGamesMap = new Map();
const channelSkipsMap = new Map();
const channelSessionScoresMap = new Map();
const channelSessionWinsMap = new Map();
const celebratedSessionsSet = new Set();

function resetChannelSession(channelId) {
  channelSkipsMap.set(channelId, 0);
  for (const key of channelSessionScoresMap.keys()) {
    if (key.startsWith(`${channelId}_`) || key === channelId) {
      channelSessionScoresMap.delete(key);
    }
  }
  for (const key of channelSessionWinsMap.keys()) {
    if (key.startsWith(`${channelId}_`) || key === channelId) {
      channelSessionWinsMap.delete(key);
    }
  }
  for (const key of celebratedSessionsSet) {
    if (key.startsWith(`${channelId}_`)) {
      celebratedSessionsSet.delete(key);
    }
  }
}

function getBasePoints(difficulty, wordLength) {
  if (difficulty === "easy") return 10;
  if (difficulty === "medium") return 20;
  if (difficulty === "hard") return 30;

  if (wordLength <= 5) return 10;
  if (wordLength <= 8) return 20;
  return 30;
}

function scrambleWord(word) {
  const arr = word.split("");
  let scrambled = word;
  let attempts = 0;
  while (scrambled === word && attempts < 10) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join("");
    attempts++;
  }
  return scrambled;
}

function generateHint(word) {
  const len = word.length;
  const revealIndex1 = 0;
  const revealIndex2 = Math.floor(len / 2);

  return word
    .split("")
    .map((char, i) =>
      i === revealIndex1 || i === revealIndex2 ? `**${char}**` : "`_`",
    )
    .join(" ");
}

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload).catch(() => null);
  }
  const res = await interaction.reply({ ...payload, withResponse: true }).catch(() => null);
  return res?.resource?.message || res;
}

async function fetchScrambleWord(category = "general", difficulty = null) {
  let minLen = 4;
  let maxLen = 10;
  if (difficulty === "easy") {
    minLen = 4;
    maxLen = 5;
  } else if (difficulty === "medium") {
    minLen = 6;
    maxLen = 8;
  } else if (difficulty === "hard") {
    minLen = 9;
    maxLen = 14;
  }
  const lenRegex = new RegExp(`^[A-Z]{${minLen},${maxLen}}$`);

  try {
    const res = await fetch(
      "https://random-word-api.herokuapp.com/word?number=15",
    );
    if (res.ok) {
      const words = await res.json();
      const validWords = words
        .map((w) => w.toUpperCase())
        .filter((w) => lenRegex.test(w));

      if (validWords.length > 0) {
        const selected =
          validWords[Math.floor(Math.random() * validWords.length)];
        return { word: selected, scrambled: null };
      }
    }
  } catch (err) {
    logger.warn(`Random Word API fetch failed: ${err.message}`);
  }

  try {
    const topicMap = {
      general: "dictionary",
      animals: "animal",
      tech: "technology",
      food: "food",
      countries: "country",
    };
    const topic = topicMap[category] || "dictionary";
    const res = await fetch(
      `https://api.datamuse.com/words?ml=${topic}&max=50`,
    );
    if (res.ok) {
      const words = await res.json();
      const validWords = words
        .map((w) => w.word.toUpperCase())
        .filter((w) => lenRegex.test(w));

      if (validWords.length > 0) {
        const selected =
          validWords[Math.floor(Math.random() * validWords.length)];
        return { word: selected, scrambled: null };
      }
    }
  } catch (err) {
    logger.warn(`Word API fetch failed: ${err.message}`);
  }

  const fallbackWords = [
    "CHALLENGE",
    "DISCOVERY",
    "EXPLORER",
    "DEVELOPER",
    "JAVASCRIPT",
    "SOLUTION",
  ];
  const matchingFallbacks = fallbackWords.filter((w) => lenRegex.test(w));
  const pool = matchingFallbacks.length > 0 ? matchingFallbacks : fallbackWords;
  const word = pool[Math.floor(Math.random() * pool.length)];
  return { word, scrambled: null };
}

export async function execute(interaction) {
  try {
    const channel = interaction.channel;
    if (!channel) return;

    if (activeGamesMap.has(channel.id)) {
      return interaction.reply({
        content:
          "<:Timer:1542147643021725796> A game is already active in this channel!",
        flags: 64,
      });
    }

    const category = interaction.options?.getString("category") || "general";
    const difficulty = interaction.options?.getString("difficulty");
    const wordData = await fetchScrambleWord(category, difficulty);
    const originalWord = wordData.word;
    const scrambled = wordData.scrambled || scrambleWord(originalWord);

    activeGamesMap.set(channel.id, true);

    const diffBadge = difficulty
      ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
      : "Standard";

    const initialPayload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.INFO,
          components: [
            {
              type: 10,
              content: `### 🔤 Word Scramble`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content:
                `Unscramble the word below!\n` +
                `**Category:** ${category.charAt(0).toUpperCase() + category.slice(1)} • **Difficulty:** ${diffBadge}\n` +
                `### \` ${scrambled.split("").join(" ")} \`\n\n` +
                `-# You have 30 seconds to solve it!\n` +
                `-# Hint Penalty: -5 pts`,
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
                  style: 2,
                  custom_id: "scramble_hint",
                  label: "Get Hint",
                },
                {
                  type: 2,
                  style: 4,
                  custom_id: "scramble_skip",
                  label: "Skip",
                },
              ],
            },
          ],
        },
      ],
    };

    const gameMsg = await sendAndFetchReply(interaction, initialPayload);
    if (!gameMsg) {
      activeGamesMap.delete(channel.id);
      return;
    }

    let hintGiven = false;
    let gameOver = false;

    const btnCollector = gameMsg.createMessageComponentCollector({
      time: 30000,
    });

    btnCollector.on("collect", async (bInt) => {
      if (bInt.customId === "scramble_hint") {
        if (hintGiven) {
          return bInt.reply({
            content: "Hint has already been revealed!",
            flags: 64,
          });
        }
        hintGiven = true;
        const hintText = generateHint(originalWord);

        await bInt.update({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: EMBED_COLORS.INFO,
              components: [
                {
                  type: 10,
                  content: `### 🔤 Word Scramble (${category.toUpperCase()})`,
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content:
                    `Unscramble the word below!\n` +
                    `### \` ${scrambled.split("").join(" ")} \`\n\n` +
                    `💡 **Hint:** ${hintText}\n\n` +
                    `-# Solve it before time runs out!`,
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
                      style: 2,
                      custom_id: "scramble_hint",
                      label: "Hint Revealed",
                      disabled: true,
                    },
                    {
                      type: 2,
                      style: 4,
                      custom_id: "scramble_skip",
                      label: "Skip",
                    },
                  ],
                },
              ],
            },
          ],
        });
      } else if (bInt.customId === "scramble_skip") {
        gameOver = true;
        btnCollector.stop("skipped");
        msgCollector.stop("skipped");

        await bInt.update({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: EMBED_COLORS.WARNING,
              components: [
                {
                  type: 10,
                  content: `### Word Skipped!`,
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: `The word was **${originalWord}**.`,
                },
              ],
            },
          ],
        });
      }
    });

    const msgCollector = channel.createMessageCollector({
      filter: (m) => !m.author.bot,
      time: 30000,
    });

    msgCollector.on("collect", async (m) => {
      if (gameOver) return;
      const input = m.content.trim().toLowerCase();
      if (input === ".skip" || input === ".s") {
        gameOver = true;
        btnCollector.stop("skipped");
        msgCollector.stop("skipped");
        await m.react("⏩").catch(() => null);
        await gameMsg
          .edit({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.WARNING,
                components: [
                  {
                    type: 10,
                    content: `### Word Skipped!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content: `The word was **${originalWord}**.`,
                  },
                ],
              },
            ],
          })
          .catch(() => null);
        return;
      }

      const guess = m.content.trim().toUpperCase();

      if (guess === originalWord) {
        gameOver = true;
        btnCollector.stop("guessed");
        msgCollector.stop("guessed");

        await m
          .react("1526228339910643793")
          .catch(() =>
            m
              .react("<:Success:1526228339910643793>")
              .catch(() => m.react("✅").catch(() => null)),
          );

        const guildId = m.guild?.id || interaction.guild?.id;
        const winnerId = m.author.id;
        const basePoints = getBasePoints(difficulty, originalWord.length);
        const pointsGained = hintGiven ? Math.max(5, basePoints - 5) : basePoints;

        const userKey = `${channel.id}_${winnerId}`;
        const currentSessionScore =
          (channelSessionScoresMap.get(userKey) || 0) + pointsGained;
        channelSessionScoresMap.set(userKey, currentSessionScore);

        const currentSessionWins =
          (channelSessionWinsMap.get(userKey) || 0) + 1;
        channelSessionWinsMap.set(userKey, currentSessionWins);

        let scoreData = {
          highScore: currentSessionScore,
          isNewHighScore: true,
          highWins: currentSessionWins,
        };
        if (guildId && winnerId) {
          scoreData = await addScrambleScore(
            guildId,
            winnerId,
            currentSessionScore,
            currentSessionWins,
          );
        }

        let showHighBadge = false;
        if (scoreData.isNewHighScore && !celebratedSessionsSet.has(userKey)) {
          celebratedSessionsSet.add(userKey);
          showHighBadge = true;
        }
        const highBadge = showHighBadge ? "\n🎯 **New Personal Best!**" : "";

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
                  content: `### <a:Tada:1544329561955770488> Correct Unscramble!`,
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content:
                    `<@${winnerId}> guessed it right!\n` +
                    `The word was **${originalWord}**!\n\n` +
                    `🔥 **+${pointsGained} Points** • **Score: ${currentSessionScore} Pts**\n${highBadge}`,
                },
              ],
            },
          ],
        });
      }
    });

    msgCollector.on("end", async (_, reason) => {
      activeGamesMap.delete(channel.id);
      if (!gameOver && reason !== "guessed" && reason !== "skipped") {
        resetChannelSession(channel.id);
        await channel
          .send({
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
                      `Nobody unscrambled the word in time!\n\n` +
                      `The correct word was **${originalWord}**.`,
                  },
                ],
              },
            ],
          })
          .catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in Scramble command execution:", err);
    Sentry.captureException(err);
  }
}
