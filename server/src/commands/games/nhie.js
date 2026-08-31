import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

const FALLBACK_NHIE = [
  "Never have I ever fallen asleep in class or at work.",
  "Never have I ever sent a text to the wrong person.",
  "Never have I ever pretended to know a stranger to avoid someone.",
  "Never have I ever accidentally liked an old post while stalking someone.",
  "Never have I ever lied about my age.",
  "Never have I ever eaten food that fell on the floor after 5 seconds.",
  "Never have I ever gotten lost in my own hometown.",
];

export const aliases = ["nhie"];

export const data = {
  name: "nhie",
  description: "Play Never Have I Ever.",
  dm_permission: false,
  options: [
    {
      name: "rating",
      description: "Filter rating: PG, PG13, or R",
      type: 3,
      required: false,
      choices: [
        { name: "PG (Family Friendly)", value: "pg" },
        { name: "PG-13 (Teen)", value: "pg13" },
        { name: "R (Bold / Spicy)", value: "r" },
      ],
    },
  ],
};

async function fetchNhieQuestion(rating = "pg") {
  const targetRating = rating || "pg";
  const endpoint = `https://api.truthordarebot.xyz/v1/nhie?rating=${encodeURIComponent(targetRating)}`;

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
    logger.warn(`NHIE API failed, using fallback: ${err.message}`);
  }

  const question = FALLBACK_NHIE[Math.floor(Math.random() * FALLBACK_NHIE.length)];
  return { question, rating: targetRating.toUpperCase() };
}

function buildNhieButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("nhie_next")
      .setLabel("Next Question")
      .setStyle(ButtonStyle.Primary)
  );
}

async function sendNhieMessage(interaction, ratingInput, isFollowUp = false, buildAiReply) {
  const requestorName = interaction.member?.displayName || interaction.user.username;
  const { question, rating } = await fetchNhieQuestion(ratingInput);

  let aiCommentary = "";
  if (typeof buildAiReply === "function") {
    try {
      const res = await buildAiReply({
        authorId: interaction.user.id,
        inputText: `Give a witty 1-sentence sarcastic remark about this ${rating} NEVER HAVE I EVER prompt: "${question}"`,
        mode: "normal",
        guild: interaction.guild,
      });
      if (res?.text) aiCommentary = res.text.trim();
    } catch (e) {
      logger.warn(`Failed to generate AI commentary for nhie: ${e.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🙈 **NEVER HAVE I EVER**")
    .setDescription(
      `${question}` +
      (aiCommentary ? `\n\n*Tars: ${aiCommentary}*` : "")
    )
    .setFooter({ text: `Rating: ${rating} • Requestor: ${requestorName}` })
    .setColor(Math.floor(Math.random() * 16777215));

  const payload = { embeds: [embed], components: [buildNhieButtons()] };

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
    time: 60000,
  });

  collector.on("collect", async (btnInteraction) => {
    try {
      if (btnInteraction.customId === "nhie_next") {
        await btnInteraction.deferUpdate();
        await sendNhieMessage(btnInteraction, ratingInput, true, buildAiReply);
      }
    } catch (err) {
      logger.error("Error in nhie button handler:", err);
    }
  });

  collector.on("end", async () => {
    try {
      const disabledButtons = new ActionRowBuilder().addComponents(
        buildNhieButtons().components.map((btn) => ButtonBuilder.from(btn).setDisabled(true))
      );
      await response.edit({ components: [disabledButtons] }).catch(() => null);
    } catch {}
  });
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    if (interaction.deferReply) {
      await interaction.deferReply();
    }

    let ratingInput = interaction.options?.getString("rating")?.toLowerCase() || "pg";

    if (interaction.commandName) {
      const rawArgs = interaction.options?.getString("new_prefix") || interaction.options?.getString("user");
      if (typeof rawArgs === "string") {
        const lower = rawArgs.toLowerCase();
        if (lower.includes("r") || lower.includes("spicy") || lower.includes("bold")) ratingInput = "r";
        else if (lower.includes("pg13")) ratingInput = "pg13";
        else if (lower.includes("pg")) ratingInput = "pg";
      }
    }

    await sendNhieMessage(interaction, ratingInput, false, buildAiReply);
  } catch (err) {
    logger.error("Error in NHIE command execution:", err);
    Sentry.captureException(err);
  }
}
