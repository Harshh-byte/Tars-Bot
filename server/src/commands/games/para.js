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
  description: "Play Paranoia game.",
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

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("paranoia_next")
      .setLabel("Next Question")
      .setStyle(ButtonStyle.Primary)
  );
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

    const { question, rating } = await fetchParanoiaQuestion(ratingInput);

    let aiCommentary = "";
    if (typeof buildAiReply === "function") {
      try {
        const aiResponse = await buildAiReply({
          authorId: interaction.user.id,
          inputText: `Give a witty 1-sentence sarcastic remark about giving this ${rating} PARANOIA question to ${interaction.user.username}: "${question}"`,
          mode: "normal",
          guild: interaction.guild,
        });
        if (aiResponse?.text) {
          aiCommentary = aiResponse.text.trim();
        }
      } catch (e) {
        logger.warn(`Failed to generate AI commentary for paranoia: ${e.message}`);
      }
    }

    const requestorName = interaction.member?.displayName || interaction.user.username;

    const embed = new EmbedBuilder()
      .setTitle("🤫 **PARANOIA**")
      .setDescription(
        `${question}` +
        (aiCommentary ? `\n\n*Tars: ${aiCommentary}*` : "")
      )
      .setFooter({ text: `Rating: ${rating} • Requestor: ${requestorName}` })
      .setColor(0x7289da);

    const payload = { embeds: [embed], components: [buildButtons()] };

    let response;
    if (interaction.deferred || interaction.replied) {
      response = await interaction.editReply(payload);
    } else {
      response = await interaction.reply({ ...payload, fetchReply: true });
    }

    attachParanoiaCollector(response, ratingInput, buildAiReply);
  } catch (err) {
    logger.error("Error in Paranoia command execution:", err);
    Sentry.captureException(err);
  }
}

function attachParanoiaCollector(message, ratingInput, buildAiReply) {
  if (!message || typeof message.createMessageComponentCollector !== "function") {
    return;
  }

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on("collect", async (btnInteraction) => {
    try {
      await btnInteraction.deferUpdate();

      const nextPrompt = await fetchParanoiaQuestion(ratingInput);

      let nextAiComment = "";
      if (typeof buildAiReply === "function") {
        try {
          const res = await buildAiReply({
            authorId: btnInteraction.user.id,
            inputText: `Give a witty 1-sentence sarcastic remark about giving this ${nextPrompt.rating} PARANOIA prompt to ${btnInteraction.user.username}: "${nextPrompt.question}"`,
            mode: "normal",
            guild: btnInteraction.guild,
          });
          if (res?.text) nextAiComment = res.text.trim();
        } catch {}
      }

      const requestorName = btnInteraction.member?.displayName || btnInteraction.user.username;

      const newEmbed = new EmbedBuilder()
        .setTitle("🤫 **PARANOIA**")
        .setDescription(
          `${nextPrompt.question}` +
          (nextAiComment ? `\n\n*Tars: ${nextAiComment}*` : "")
        )
        .setFooter({ text: `Rating: ${nextPrompt.rating} • Requestor: ${requestorName}` })
        .setColor(0x7289da);

      const newMsg = await btnInteraction.followUp({
        embeds: [newEmbed],
        components: [buildButtons()],
        fetchReply: true,
      });

      attachParanoiaCollector(newMsg, ratingInput, buildAiReply);
    } catch (err) {
      logger.error("Error in paranoia button handler:", err);
    }
  });

  collector.on("end", async () => {
    try {
      const disabledButtons = new ActionRowBuilder().addComponents(
        buildButtons().components.map((btn) => ButtonBuilder.from(btn).setDisabled(true))
      );
      await message.edit({ components: [disabledButtons] }).catch(() => null);
    } catch {}
  });
}
