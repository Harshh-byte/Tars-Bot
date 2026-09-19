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

async function fetchRandomPokemon(gen = "gen1", channelId = "default") {
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
    if (rawArgs.includes("gen2") || rawArgs.includes("johto"))
      genInput = "gen2";
    else if (rawArgs.includes("gen3") || rawArgs.includes("hoenn"))
      genInput = "gen3";
    else if (rawArgs.includes("gen4") || rawArgs.includes("sinnoh"))
      genInput = "gen4";
    else if (rawArgs.includes("gen5") || rawArgs.includes("unova"))
      genInput = "gen5";
    else if (rawArgs.includes("all")) genInput = "all";
    else genInput = "gen1";
  }

  return startPokemonGame(interaction, client, false, genInput, buildAiReply);
}

async function startPokemonGame(
  interaction,
  client,
  isFollowUp = false,
  genSelection = "gen1",
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
      channelSkipsMap.set(channelId, 0);
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
    const initialHint = generateHint(targetPokemon.name, 0);

    const embed = new EmbedBuilder()
      .setAuthor({ name: userDisplayName, iconURL: userAvatar })
      .setTitle("Who's That Pokémon?")
      .setThumbnail(targetPokemon.imageUrl)
      .setDescription(
        `**Type:** ${targetPokemon.types}\n` +
          `**Hint:** ${initialHint}\n\n` +
          `You have 30 seconds to guess the Pokémon.\n` +
          `*Type your answer in the chat or \`.skip\` to skip.*`,
      )
      .setColor(EMBED_COLORS.GREY);

    const payload = { embeds: [embed], components: [] };

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

    let winnerMessage = null;
    const closeMatchUsers = new Set();

    const hintTimer = setTimeout(async () => {
      try {
        if (!collector.ended) {
          const secondHint = generateHint(targetPokemon.name, 1);
          const updatedEmbed = EmbedBuilder.from(embed).setDescription(
            `**Type:** ${targetPokemon.types}\n` +
              `**Hint:** ${secondHint}\n\n` +
              `You have 30 seconds to guess the Pokémon.\n` +
              `*Type your answer in the chat or \`.skip\` to skip.*`,
          );
          if (response && typeof response.edit === "function") {
            await response.edit({ embeds: [updatedEmbed] }).catch(() => null);
          }
        }
      } catch {}
    }, 12000);
    activeHintTimersMap.set(channelId, hintTimer);

    collector.on("collect", async (m) => {
      const input = m.content.trim().toLowerCase();

      if (input === ".skip" || input === ".s") {
        const skipsUsed = channelSkipsMap.get(channelId) || 0;
        if (skipsUsed >= 5) {
          await m
            .reply({
              content:
                "⚠️ **Maximum skips reached (5/5)!** You must guess this Pokémon or wait for the timer.",
            })
            .catch(() => null);
          return;
        }

        channelSkipsMap.set(channelId, skipsUsed + 1);
        clearTimeout(hintTimer);
        activeHintTimersMap.delete(channelId);
        collector.stop("skipped");
        await m.react("⏩").catch(() => null);
        return;
      }

      const isCorrect = targetPokemon.aliases.some(
        (alias) => alias.toLowerCase() === input,
      );

      if (isCorrect) {
        winnerMessage = m;
        clearTimeout(hintTimer);
        activeHintTimersMap.delete(channelId);
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
          await m
            .reply({
              content: `*You're so close! Check for typos!*`,
            })
            .catch(() => null);
        }
      }
    });

    collector.on("end", async (_, reason) => {
      clearTimeout(hintTimer);
      activeHintTimersMap.delete(channelId);
      if (activeCollectorsMap.get(channelId) === collector) {
        activeCollectorsMap.delete(channelId);
      }

      if (reason === "superceded") return;

      try {
        if (reason === "skipped") {
          const currentSkips = channelSkipsMap.get(channelId) || 1;
          const remainingSkips = Math.max(0, 5 - currentSkips);

          const skipEmbed = new EmbedBuilder()
            .setTitle("**Pokémon Skipped!**")
            .setDescription(
              `The Pokémon was **${targetPokemon.name}**!\n\n` +
                `*Skips remaining for this game:* **${remainingSkips}/5**`,
            )
            .setThumbnail(targetPokemon.imageUrl)
            .setColor(EMBED_COLORS.WARNING);

          await channel.send({ embeds: [skipEmbed] });

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

          const pointsGained = targetPokemon.points;

          let scoreData = { totalPoints: pointsGained, totalWins: 1 };
          if (serverId !== "DM") {
            scoreData = await addPokemonScore(serverId, winnerId, pointsGained);
          }

          const winnerMention = `<@${winnerId}>`;
          const currentSessionScore = (channelSessionScoresMap.get(channelId) || 0) + pointsGained;
          channelSessionScoresMap.set(channelId, currentSessionScore);

          const winEmbed = new EmbedBuilder()
            .setTitle("<a:Tada:1544329561955770488> **Correct Guess!**")
            .setDescription(
              `${winnerMention} guessed it right!\n` +
                `The Pokémon was **${targetPokemon.name}**!\n\n` +
                `🏆 **+${pointsGained} Points** *(Game Score: **${currentSessionScore}** Pts | Total: **${scoreData.totalPoints}** Pts)*`,
            )
            .setThumbnail(targetPokemon.imageUrl)
            .setColor(EMBED_COLORS.SUCCESS);

          await channel.send({ embeds: [winEmbed] });

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
          channelSkipsMap.set(channelId, 0);
          channelSessionScoresMap.set(channelId, 0);
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⌛ **Time's Up!**")
            .setDescription(
              `Nobody guessed the Pokémon in time!\n\n` +
                `The correct answer was **${targetPokemon.name}**.`,
            )
            .setThumbnail(targetPokemon.imageUrl)
            .setColor(EMBED_COLORS.TIMEOUT);

          const resultMsg = await channel.send({
            embeds: [timeoutEmbed],
            components: [buildButtons()],
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

        channelSkipsMap.set(channelId, 0);
        channelSessionScoresMap.set(channelId, 0);

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
