import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const aliases = ["ask"];

export const data = {
  name: "ask",
  description: "Ask Tars anything.",
  dm_permission: false,
  options: [
    {
      name: "question",
      description: "Question to ask.",
      type: 3,
      required: true,
    },
  ],
};

export async function execute(interaction, client, { buildAiReply } = {}) {
  try {
    let question = interaction.options?.getString("question");
    if (!question || question.trim() === "") {
      question = interaction.options?.getString?.();
    }

    if (!question || question.trim() === "") {
      const promptHelp = "Please provide a question!";
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: promptHelp });
      }
      return interaction.reply({ content: promptHelp });
    }

    if (interaction.deferReply) {
      await interaction.deferReply().catch(() => null);
    }

    let answerText = "";
    if (typeof buildAiReply === "function") {
      const res = await buildAiReply({
        authorId: interaction.user?.id || interaction.author?.id,
        inputText: question,
        mode: "ask",
        authorMember: interaction.member,
        guild: interaction.guild,
      });
      answerText = res?.text;
    }

    if (!answerText || answerText.trim() === "") {
      answerText =
        "I couldn't process that question right now. Please try asking again!";
    }

    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp({ content: answerText });
    }
    return await interaction.reply({ content: answerText });
  } catch (err) {
    logger.error("Error in ask command execution:", err);
    Sentry.captureException(err);
    const errContent = "An error occurred while answering your question.";
    if (interaction.deferred || interaction.replied) {
      return await interaction
        .followUp({ content: errContent })
        .catch(() => null);
    }
    return await interaction.reply({ content: errContent }).catch(() => null);
  }
}
