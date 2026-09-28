import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

const FALLBACK_TRUTHS = [
  "What is the most embarrassing thing you've done on a Discord call?",
  "If you had to kick one server member forever, who would it be?",
  "What is a secret you have never told anyone in this server?",
  "What is the worst lie you've told to get out of hanging out with friends?",
  "If you were forced to date someone from this server, who would you choose?",
  "What is your biggest guilty pleasure that you're ashamed of?",
  "Have you ever stalked someone's profile in this server for hours?",
];

const FALLBACK_DARES = [
  "Send the 5th image in your gallery into this chat with zero context.",
  "Change your server nickname to 'TARS's Loyal Servant' for 24 hours.",
  "Voice call the last person you texted and sing them Happy Birthday.",
  "Send a message to your crush or ex saying 'I miss you' and show proof.",
  "Type your next 5 messages in this server using only your nose.",
  "Post your most cringe selfie in this channel.",
  "Let the channel pick your profile picture for the next 12 hours.",
];

export const aliases = ["truth", "dare", "random"];

export const data = {
  name: "tod",
  description: "Play Truth or Dare.",
  dm_permission: false,
  options: [
    {
      name: "type",
      description: "Choose Truth, Dare, or Random.",
      type: 3,
      required: false,
      choices: [
        { name: "Truth", value: "truth" },
        { name: "Dare", value: "dare" },
        { name: "Random", value: "random" },
      ],
    },
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

const getRandomColor = () => Math.floor(Math.random() * 16777215);

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const res = await interaction.reply({ ...payload, withResponse: true });
  return res?.resource?.message || res;
}

async function fetchQuestion(type, rating = "pg") {
  const chosenType =
    type === "random" ? (Math.random() > 0.5 ? "truth" : "dare") : type;
  const targetRating = rating || "pg";
  const ratingParam = `?rating=${encodeURIComponent(targetRating)}`;
  const endpoint = `https://api.truthordarebot.xyz/v1/${chosenType}${ratingParam}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.question) {
        return {
          type: chosenType,
          headerType: type,
          question: data.question,
          rating: (data.rating || targetRating).toUpperCase(),
        };
      }
    }
  } catch (err) {
    logger.warn(`TruthOrDare API failed, using fallback: ${err.message}`);
  }

  const fallbacks = chosenType === "truth" ? FALLBACK_TRUTHS : FALLBACK_DARES;
  const question = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    type: chosenType,
    headerType: type,
    question,
    rating: targetRating.toUpperCase(),
  };
}

function buildV2Payload(
  promptType,
  question,
  rating,
  aiCommentary,
  requestorName,
  headerType,
) {
  const displayHeader = headerType || promptType;
  let titleIcon = "🎲";
  if (displayHeader === "truth") titleIcon = "❓";
  else if (displayHeader === "dare") titleIcon = "🎯";

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: getRandomColor(),
        components: [
          {
            type: 10,
            content: `### ${titleIcon} ${displayHeader.toUpperCase()}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              `${question}` +
              (aiCommentary ? `\n\n*TARS: ${aiCommentary}*` : "") +
              `\n\n-# Rating: ${rating} • Requestor: ${requestorName}`,
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
                custom_id: "tod_truth",
                style: 1,
                label: "Truth",
                emoji: { name: "❓" },
              },
              {
                type: 2,
                custom_id: "tod_dare",
                style: 4,
                label: "Dare",
                emoji: { name: "🎯" },
              },
              {
                type: 2,
                custom_id: "tod_random",
                style: 2,
                label: "Random",
                emoji: { name: "🎲" },
              },
            ],
          },
        ],
      },
    ],
  };
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    let rawInput = interaction.options?.getString("type")?.toLowerCase();
    let ratingInput =
      interaction.options?.getString("rating")?.toLowerCase() || "pg";

    if (interaction.commandName) {
      if (interaction.commandName === "truth") rawInput = "truth";
      else if (interaction.commandName === "dare") rawInput = "dare";

      const rawArgs = interaction.options?.getString("new_prefix");
      if (typeof rawArgs === "string") {
        const lower = rawArgs.toLowerCase();
        if (
          lower.includes("r") ||
          lower.includes("spicy") ||
          lower.includes("bold")
        )
          ratingInput = "r";
        else if (lower.includes("pg13")) ratingInput = "pg13";
        else if (lower.includes("pg")) ratingInput = "pg";
      }
    }

    const type =
      rawInput && ["truth", "dare"].includes(rawInput) ? rawInput : "random";
    const {
      type: promptType,
      headerType,
      question,
      rating,
    } = await fetchQuestion(type, ratingInput);

    let aiCommentary = "";
    if (typeof buildAiReply === "function") {
      try {
        const aiResponse = await buildAiReply({
          authorId: interaction.user.id,
          inputText: `Give a witty 1-sentence sarcastic remark about giving this ${rating} ${promptType.toUpperCase()} question to ${interaction.user.username}: "${question}"`,
          mode: "normal",
          guild: interaction.guild,
        });
        if (aiResponse?.text) {
          aiCommentary = aiResponse.text.trim();
        }
      } catch (e) {
        logger.warn(`Failed to generate AI commentary for tod: ${e.message}`);
      }
    }

    const requestorName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;

    const payload = buildV2Payload(
      promptType,
      question,
      rating,
      aiCommentary,
      requestorName,
      headerType,
    );
    const response = await sendAndFetchReply(interaction, payload);

    attachTodCollector(response, ratingInput, buildAiReply);
  } catch (err) {
    logger.error("Error in Truth or Dare command execution:", err);
    Sentry.captureException(err);
  }
}

function attachTodCollector(message, ratingInput, buildAiReply) {
  if (
    !message ||
    typeof message.createMessageComponentCollector !== "function"
  ) {
    return;
  }

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 86400000,
  });

  collector.on("collect", async (btnInteraction) => {
    try {
      await btnInteraction.deferUpdate();

      const selectedType = btnInteraction.customId.replace("tod_", "");
      const nextPrompt = await fetchQuestion(selectedType, ratingInput);

      let nextAiComment = "";
      if (typeof buildAiReply === "function") {
        try {
          const res = await buildAiReply({
            authorId: btnInteraction.user.id,
            inputText: `Give a witty 1-sentence sarcastic remark about giving this ${nextPrompt.rating} ${nextPrompt.type.toUpperCase()} prompt to ${btnInteraction.user.username}: "${nextPrompt.question}"`,
            mode: "normal",
            guild: btnInteraction.guild,
          });
          if (res?.text) nextAiComment = res.text.trim();
        } catch {}
      }

      const requestorName =
        btnInteraction.member?.displayName ||
        btnInteraction.user.displayName ||
        btnInteraction.user.username;

      const payload = buildV2Payload(
        nextPrompt.type,
        nextPrompt.question,
        nextPrompt.rating,
        nextAiComment,
        requestorName,
        nextPrompt.headerType,
      );
      const newMsg = await sendAndFetchReply(btnInteraction, payload);

      attachTodCollector(newMsg, ratingInput, buildAiReply);
    } catch (err) {
      logger.error("Error in tod button handler:", err);
    }
  });
}
