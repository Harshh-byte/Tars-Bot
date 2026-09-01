import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

const FALLBACK_PARANOIA = [
  "Who in this server is most likely to end up on a reality TV show?",
  "Who here has the worst sleep schedule?",
  "Who in this server is most likely to accidentally leak their own search history?",
  "Who is most likely to spend all their savings on something dumb?",
  "Who here is secretely a master villain in real life?",
  "Who in this server is most likely to survive a zombie apocalypse?",
  "Who is the biggest closet nerd in this channel?",
];

export const aliases = ["paranoia", "para"];

export const data = {
  name: "para",
  description: "Play Paranoia.",
  dm_permission: false,
  options: [
    {
      name: "rating",
      description: "Filter rating",
      type: 3,
      required: false,
      choices: [
        { name: "PG (Family Friendly)", value: "pg" },
        { name: "PG-13 (Teen)", value: "pg13" },
        { name: "R (Spicy)", value: "r" },
      ],
    },
  ],
};

async function fetchParanoiaQuestion(rating = "pg") {
  const targetRating = rating || "pg";
  const endpoint = `https://api.truthordarebot.xyz/v1/paranoia?rating=${encodeURIComponent(targetRating)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.question) {
        return {
          question: data.question,
          rating: (data.rating || targetRating).toUpperCase(),
        };
      }
    }
  } catch (err) {
    logger.warn(`Paranoia API failed, using fallback: ${err.message}`);
  }

  const question = FALLBACK_PARANOIA[Math.floor(Math.random() * FALLBACK_PARANOIA.length)];
  return { question, rating: targetRating.toUpperCase() };
}

function buildParaButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("para_next")
      .setLabel("Next Question")
      .setStyle(ButtonStyle.Primary)
  );
}

async function sendParaMessage(interaction, ratingInput, isFollowUp = false, buildAiReply) {
  const requestorName = interaction.member?.displayName || interaction.user.username;
  const { question, rating } = await fetchParanoiaQuestion(ratingInput);

  let aiCommentary = "";
  if (typeof buildAiReply === "function") {
    try {
      const res = await buildAiReply({
        authorId: interaction.user.id,
        inputText: `Give a witty 1-sentence sarcastic remark about this ${rating} PARANOIA question: "${question}"`,
        mode: "normal",
        guild: interaction.guild,
      });
      if (res?.text) aiCommentary = res.text.trim();
    } catch (e) {
      logger.warn(`Failed to generate AI commentary for paranoia: ${e.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🤫 **PARANOIA**")
    .setDescription(
      `${question}` +
      (aiCommentary ? `\n\n*Tars: ${aiCommentary}*` : "")
    )
    .setFooter({ text: `Rating: ${rating} • Requestor: ${requestorName}` })
    .setColor(Math.floor(Math.random() * 16777215));

  const payload = { embeds: [embed], components: [buildParaButtons()] };

  let response;
  if (isFollowUp) {
    response = await interaction.followUp({ ...payload, fetchReply: true });
  } else if (interaction.deferred || interaction.replied) {
    response = await interaction.editReply(payload);
  } else {
    response = await interaction.reply({ ...payload, fetchReply: true });
  }

  if (!response || typeof response.createMessageComponentCollector !== "function") {
    return;
  }

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 86400000,
  });

  collector.on("collect", async (btnInteraction) => {
    try {
      if (btnInteraction.customId === "para_next") {
        await btnInteraction.deferUpdate();
        await sendParaMessage(btnInteraction, ratingInput, true, buildAiReply);
      }
    } catch (err) {
      logger.error("Error in para button handler:", err);
    }
  });
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    if (interaction.deferReply) {
      await interaction.deferReply();
    }

    let ratingInput = interaction.options?.getString("rating")?.toLowerCase() || "pg";

    if (interaction.commandName) {
      const rawArgs = interaction.options?.getString("new_prefix");
      if (typeof rawArgs === "string") {
        const lower = rawArgs.toLowerCase();
        if (lower.includes("r") || lower.includes("spicy")) ratingInput = "r";
        else if (lower.includes("pg13")) ratingInput = "pg13";
        else if (lower.includes("pg")) ratingInput = "pg";
      }
    }

    await sendParaMessage(interaction, ratingInput, false, buildAiReply);
  } catch (err) {
    logger.error("Error in Paranoia command execution:", err);
    Sentry.captureException(err);
  }
}
