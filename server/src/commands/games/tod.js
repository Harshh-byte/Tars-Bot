import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
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
  "Change your server nickname to 'Tars's Loyal Servant' for 24 hours.",
  "Voice call the last person you texted and sing them Happy Birthday.",
  "Send a message to your crush or ex saying 'I miss you' and show proof.",
  "Type your next 5 messages in this server using only your nose.",
  "Post your most cringe selfie in this channel.",
  "Let the channel pick your profile picture for the next 12 hours.",
];

export const aliases = ["truth", "dare", "tod"];

export const data = {
  name: "tod",
  description: "Play Truth or Dare.",
  dm_permission: false,
  options: [
    {
      name: "type",
      description: "Choose Truth, Dare, or Random",
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

async function fetchQuestion(type, rating = "pg") {
  const chosenType = type === "random" ? (Math.random() > 0.5 ? "truth" : "dare") : type;
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
  return { type: chosenType, question, rating: targetRating.toUpperCase() };
}

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("tod_truth")
      .setLabel("Truth")
      .setEmoji("❓")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("tod_dare")
      .setLabel("Dare")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("tod_random")
      .setLabel("Random")
      .setEmoji("🎲")
      .setStyle(ButtonStyle.Secondary)
  );
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    if (interaction.deferReply) {
      await interaction.deferReply();
    }

    let rawInput = interaction.options?.getString("type")?.toLowerCase();
    let ratingInput = interaction.options?.getString("rating")?.toLowerCase() || "pg";

    if (interaction.commandName) {
      if (interaction.commandName === "truth") rawInput = "truth";
      else if (interaction.commandName === "dare") rawInput = "dare";

      const rawArgs = interaction.options?.getString("new_prefix");
      if (typeof rawArgs === "string") {
        const lower = rawArgs.toLowerCase();
        if (lower.includes("r") || lower.includes("spicy") || lower.includes("bold")) ratingInput = "r";
        else if (lower.includes("pg13")) ratingInput = "pg13";
        else if (lower.includes("pg")) ratingInput = "pg";
      }
    }

    const type = rawInput && ["truth", "dare"].includes(rawInput) ? rawInput : "random";

    const { type: promptType, question, rating } = await fetchQuestion(type, ratingInput);

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

    const requestorName = interaction.member?.displayName || interaction.user.username;

    const titleIcon = promptType === "truth" ? "❓" : "🎯";
    const embed = new EmbedBuilder()
      .setTitle(`${titleIcon} **${promptType.toUpperCase()}**`)
      .setDescription(
        `${question}` +
        (aiCommentary ? `\n\n*Tars: ${aiCommentary}*` : "")
      )
      .setFooter({ text: `Rating: ${rating} • Requestor: ${requestorName}` })
      .setColor(Math.floor(Math.random() * 16777215));

    const payload = { embeds: [embed], components: [buildButtons()] };

    let response;
    if (interaction.deferred || interaction.replied) {
      response = await interaction.editReply(payload);
    } else {
      response = await interaction.reply({ ...payload, fetchReply: true });
    }

    attachTodCollector(response, ratingInput, buildAiReply);
  } catch (err) {
    logger.error("Error in Truth or Dare command execution:", err);
    Sentry.captureException(err);
  }
}

function attachTodCollector(message, ratingInput, buildAiReply) {
  if (!message || typeof message.createMessageComponentCollector !== "function") {
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

      const requestorName = btnInteraction.member?.displayName || btnInteraction.user.username;

      const nextIcon = nextPrompt.type === "truth" ? "❓" : "🎯";
      const newEmbed = new EmbedBuilder()
        .setTitle(`${nextIcon} **${nextPrompt.type.toUpperCase()}**`)
        .setDescription(
          `${nextPrompt.question}` +
          (nextAiComment ? `\n\n*Tars: ${nextAiComment}*` : "")
        )
        .setFooter({ text: `Rating: ${nextPrompt.rating} • Requestor: ${requestorName}` })
        .setColor(Math.floor(Math.random() * 16777215));

      const newMsg = await btnInteraction.followUp({
        embeds: [newEmbed],
        components: [buildButtons()],
        fetchReply: true,
      });

      attachTodCollector(newMsg, ratingInput, buildAiReply);
    } catch (err) {
      logger.error("Error in tod button handler:", err);
    }
  });
}
