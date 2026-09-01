import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

const FALLBACK_WYR = [
  "Would you rather lose the ability to speak or lose the ability to read?",
  "Would you rather always speak your mind or never speak again?",
  "Would you rather be able to fly at 5mph or run at 100mph?",
  "Would you rather know the date of your death or the cause of your death?",
  "Would you rather live without internet for a year or live without music for a year?",
  "Would you rather fight 100 duck-sized horses or 1 horse-sized duck?",
  "Would you rather always have bad Wi-Fi or always have 1% phone battery?",
];

export const aliases = ["wyr"];

export const data = {
  name: "wyr",
  description: "Play Would You Rather.",
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
        { name: "R (Spicy)", value: "r" },
      ],
    },
  ],
};

async function fetchWyrQuestion(rating = "pg") {
  const targetRating = rating || "pg";
  const endpoint = `https://api.truthordarebot.xyz/v1/wyr?rating=${encodeURIComponent(targetRating)}`;

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
    logger.warn(`WYR API failed, using fallback: ${err.message}`);
  }

  const question = FALLBACK_WYR[Math.floor(Math.random() * FALLBACK_WYR.length)];
  return { question, rating: targetRating.toUpperCase() };
}

function buildWyrButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wyr_next")
      .setLabel("Next Question")
      .setStyle(ButtonStyle.Primary)
  );
}

async function sendWyrMessage(interaction, ratingInput, isFollowUp = false, buildAiReply) {
  const requestorName = interaction.member?.displayName || interaction.user.username;
  const { question, rating } = await fetchWyrQuestion(ratingInput);

  let aiCommentary = "";
  if (typeof buildAiReply === "function") {
    try {
      const res = await buildAiReply({
        authorId: interaction.user.id,
        inputText: `Give a witty 1-sentence sarcastic remark about this ${rating} WOULD YOU RATHER dilemma: "${question}"`,
        mode: "normal",
        guild: interaction.guild,
      });
      if (res?.text) aiCommentary = res.text.trim();
    } catch (e) {
      logger.warn(`Failed to generate AI commentary for wyr: ${e.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🤔 **WOULD YOU RATHER**")
    .setDescription(
      `${question}` +
      (aiCommentary ? `\n\n*Tars: ${aiCommentary}*` : "")
    )
    .setFooter({ text: `Rating: ${rating} • Requestor: ${requestorName}` })
    .setColor(Math.floor(Math.random() * 16777215));

  const payload = { embeds: [embed], components: [buildWyrButtons()] };

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
      if (btnInteraction.customId === "wyr_next") {
        await btnInteraction.deferUpdate();
        await sendWyrMessage(btnInteraction, ratingInput, true, buildAiReply);
      }
    } catch (err) {
      logger.error("Error in wyr button handler:", err);
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
      const rawArgs = interaction.options?.getString("new_prefix") || interaction.options?.getString("user");
      if (typeof rawArgs === "string") {
        const lower = rawArgs.toLowerCase();
        if (lower.includes("r") || lower.includes("spicy") || lower.includes("bold")) ratingInput = "r";
        else if (lower.includes("pg13")) ratingInput = "pg13";
        else if (lower.includes("pg")) ratingInput = "pg";
      }
    }

    await sendWyrMessage(interaction, ratingInput, false, buildAiReply);
  } catch (err) {
    logger.error("Error in WYR command execution:", err);
    Sentry.captureException(err);
  }
}
