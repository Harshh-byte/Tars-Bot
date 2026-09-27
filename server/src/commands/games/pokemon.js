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
import { addPokemonScore } from "../../services/database.js";
import { showLeaderboard } from "./leaderboard.js";

const recentPokemonMap = new Map();
const channelSkipsMap = new Map();
const channelSessionScoresMap = new Map();
const activeCollectorsMap = new Map();
const activeHintTimersMap = new Map();

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

async function fetchRandomPokemon(gen = "all", channelId = "default") {
  let minId = 1;
  let maxId = 151;

  if (gen === "gen2") {
    minId = 152;
    maxId = 251;
  } else if (gen === "gen3") {
    minId = 252;
    maxId = 386;
  } else if (gen === "gen4") {
    minId = 387;
    maxId = 493;
  } else if (gen === "gen5") {
    minId = 494;
    maxId = 649;
  } else if (gen === "all") {
    minId = 1;
    maxId = 898;
  }

  if (!recentPokemonMap.has(channelId)) {
    recentPokemonMap.set(channelId, []);
  }
  const recentList = recentPokemonMap.get(channelId);

  let pokemonId;
  let attempts = 0;
  do {
    pokemonId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
    attempts++;
  } while (recentList.includes(pokemonId) && attempts < 20);

  recentList.push(pokemonId);
  if (recentList.length > 25) recentList.shift();

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    if (res.ok) {
      const data = await res.json();
      const rawName = data.name;
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const types = data.types
        .map((t) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1))
        .join(" / ");
      const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

      return {
        id: pokemonId,
        name: formattedName,
        types: types || "Unknown",
        imageUrl,
        aliases: [rawName.toLowerCase(), formattedName.toLowerCase()],
        points: pokemonId <= 151 ? 15 : 25,
      };
    }
  } catch (err) {
    logger.warn(`PokéAPI fetch failed for ID ${pokemonId}: ${err.message}`);
  }

  return {
    id: 25,
    name: "Pikachu",
    types: "Electric",
    imageUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    aliases: ["pikachu"],
    points: 15,
  };
}

export const aliases = ["poke"];

export const data = {
  name: "pokemon",
  description: "Who's That Pokémon?",
  dm_permission: false,
  options: [
    {
      name: "generation",
      description: "Select Generation.",
      type: 3,
      required: false,
      choices: [
        { name: "Gen 1 (Kanto)", value: "gen1" },
        { name: "Gen 2 (Johto)", value: "gen2" },
        { name: "Gen 3 (Hoenn)", value: "gen3" },
        { name: "Gen 4 (Sinnoh)", value: "gen4" },
        { name: "Gen 5 (Unova)", value: "gen5" },
        { name: "All Generations", value: "all" },
      ],
    },
  ],
};

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pokemon_next")
      .setLabel("Play Again")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("show_lb_pokemon")
      .setLabel("Leaderboard")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  const rawArgs = (
    interaction.options?.getString("generation") ||
    interaction.options?.getString("getString") ||
    ""
  ).toLowerCase();

  let genInput = interaction.options?.getString("generation")?.toLowerCase();
  if (!genInput) {
    if (rawArgs.includes("gen1") || rawArgs.includes("kanto"))
      genInput = "gen1";
    else if (rawArgs.includes("gen2") || rawArgs.includes("johto"))
      genInput = "gen2";
    else if (rawArgs.includes("gen3") || rawArgs.includes("hoenn"))
      genInput = "gen3";
    else if (rawArgs.includes("gen4") || rawArgs.includes("sinnoh"))
      genInput = "gen4";
    else if (rawArgs.includes("gen5") || rawArgs.includes("unova"))
      genInput = "gen5";
    else genInput = "all";
  }

  return startPokemonGame(interaction, client, false, genInput, buildAiReply);
}

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

async function startPokemonGame(
  interaction,
  client,
  isFollowUp = false,
  genSelection = "all",
  buildAiReply,
) {
  try {
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
      resetChannelSession(channelId);
    }
    const targetPokemon = await fetchRandomPokemon(genSelection, channelId);

    const userDisplayName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;
    const userAvatar = interaction.user.displayAvatarURL({
      extension: "png",
      size: 256,
    });
    const revealedIndices = new Set();
    const letterIndices = [];
    let isFirstLetter = true;
    targetPokemon.name.split("").forEach((char, idx) => {
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

    const buildPokemonPrompt = (currentHint) => ({
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.INFO,
          components: [
            {
              type: 10,
              content: `### 🔮 Who's That Pokémon?`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content:
                    `**Type:** ${targetPokemon.types}\n` +
                    `**Pokémon:** ${currentHint}\n\n` +
                    `-# You have 30 seconds to guess!\n` +
                    `-# Hint Penalty: -5 pts`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: targetPokemon.imageUrl,
                },
              },
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
                      custom_id: "pokemon_hint",
                      label: "Hint Revealed",
                      disabled: true,
                    }
                  : {
                      type: 2,
                      style: 2,
                      custom_id: "pokemon_hint",
                      label: "Get Hint",
                    },
                {
                  type: 2,
                  style: 4,
                  custom_id: "pokemon_skip",
                  label: "Skip",
                },
              ],
            },
          ],
        },
      ],
    });

    const payload = buildPokemonPrompt(
      getRevealedHint(targetPokemon.name, revealedIndices),
    );

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
      if (bInt.customId === "pokemon_hint") {
        if (hintClicks >= maxHintClicks) {
          return bInt
            .reply({
              content: "Maximum hints already revealed for this Pokémon!",
              flags: 64,
            })
            .catch(() => null);
        }

        const unrevealed = letterIndices.filter(
          (idx) => !revealedIndices.has(idx),
        );
        if (unrevealed.length > 0) {
          const revealAmount = Math.min(
            unrevealed.length,
            Math.ceil(unrevealed.length * 0.4),
          );
          for (let i = 0; i < revealAmount; i++) {
            const randomIndex = Math.floor(Math.random() * unrevealed.length);
            const chosen = unrevealed.splice(randomIndex, 1)[0];
            revealedIndices.add(chosen);
          }
        }
        hintClicks++;

        const updatedHint = getRevealedHint(
          targetPokemon.name,
          revealedIndices,
        );
        await bInt.update(buildPokemonPrompt(updatedHint)).catch(() => null);
      } else if (bInt.customId === "pokemon_skip") {
        const currentSkips = channelSkipsMap.get(channelId) || 0;
        if (currentSkips >= 5) {
          return bInt
            .reply({
              content:
                "<:Warning:1526228248458035381> **Maximum skips reached!** You must guess this Pokémon or wait for the timer.",
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

      const isCorrect = targetPokemon.aliases.some(
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
      } else if (isCloseMatch(input, targetPokemon.aliases)) {
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
                    content: `### Pokémon Skipped!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `The Pokémon was **${targetPokemon.name}**!\n\n` +
                      `-# Skips remaining: ${remainingSkips}/5`,
                  },
                ],
              },
            ],
          });

          setTimeout(async () => {
            await startPokemonGame(
              interaction,
              client,
              true,
              genSelection,
              buildAiReply,
            );
          }, 1500);
        } else if (reason === "correct" && winnerMessage) {
          const winnerId = winnerMessage.author.id;
          const serverId = interaction.guild?.id || "DM";

          const basePoints = targetPokemon.points;
          const hintDeduction = hintClicks * 5;
          const pointsGained = Math.max(1, basePoints - hintDeduction);

          const userKey = `${channelId}_${winnerId}`;
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
          if (serverId !== "DM") {
            scoreData = await addPokemonScore(
              serverId,
              winnerId,
              currentSessionScore,
              currentSessionWins,
            );
          }

          const winnerMention = `<@${winnerId}>`;
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
                      `The Pokémon was **${targetPokemon.name}**!\n\n` +
                      `🔥 **+${pointsGained} Points** • **Score: ${currentSessionScore} Pts**\n${highBadge}`,
                  },
                ],
              },
            ],
          });

          setTimeout(async () => {
            await startPokemonGame(
              interaction,
              client,
              true,
              genSelection,
              buildAiReply,
            );
          }, 1500);
        } else {
          resetChannelSession(channelId);

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
                      `Nobody guessed the Pokémon in time!\n\n` +
                      `The correct answer was **${targetPokemon.name}**.`,
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
                        custom_id: "pokemon_next",
                        label: "Play Again",
                      },
                      {
                        type: 2,
                        style: 2,
                        custom_id: "show_lb_pokemon",
                        label: "Leaderboard",
                        emoji: { name: "🏆" },
                      },
                    ],
                  },
                ],
              },
            ],
          });

          attachPokemonNextCollector(
            resultMsg,
            interaction,
            client,
            genSelection,
            buildAiReply,
          );
        }
      } catch (err) {
        logger.error("Error ending pokemon game collector:", err);
      }
    });
  } catch (err) {
    logger.error("Error in pokemon command execution:", err);
    Sentry.captureException(err);
  }
}

function attachPokemonNextCollector(
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

      if (btnInteraction.customId === "pokemon_next") {
        buttonCollector.stop("clicked");
        if (btnInteraction.message && btnInteraction.message.components) {
          const disabledRows = btnInteraction.message.components.map((row) => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach((comp) => {
              if (comp.data.custom_id === "pokemon_next") {
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

        resetChannelSession(channelId);

        await startPokemonGame(
          btnInteraction,
          client,
          true,
          extraSetting,
          buildAiReply,
        );
      } else if (btnInteraction.customId === "show_lb_pokemon") {
        await showLeaderboard(btnInteraction, client, "pokemon");
      }
    } catch (err) {
      logger.error("Error in pokemon button execution:", err);
    }
  });
}
