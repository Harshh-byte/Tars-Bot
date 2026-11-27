import logger from "../../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, disownChild } from "../../../services/database.js";

export const data = {
  name: "disown",
  description: "Disown a child.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "Child to disown.",
      type: 6,
      required: true,
    },
  ],
};

function buildCard(content, accentColor = 0xed4245) {
  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: [
          {
            type: 10,
            content,
          },
        ],
      },
    ],
  };
}

export async function execute(interaction, client) {
  try {
    const author = interaction.user || interaction.author;
    const serverId = interaction.guild?.id;

    if (!serverId) {
      const payload = buildCard(
        "This command can only be used inside a server!",
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const targetUser =
      interaction.options?.getUser("user") ||
      interaction.mentions?.users?.first();

    if (!targetUser) {
      const payload = buildCard(
        "Please mention or select the child you want to disown!",
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.id === author.id) {
      const payload = buildCard(
        "Disowning yourself? What, did you finally realize you're a disappointment to yourself too?",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    if (targetUser.bot) {
      const payload = buildCard(
        "Disowning a bot? You never owned it in the first place, delusional clown.",
        0xed4245,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    const authorFam = await getUserFamily(serverId, author.id);
    if (!authorFam.childrenIds.includes(targetUser.id)) {
      const payload = buildCard(
        `<@${targetUser.id}> is not your child!`,
        0xffa502,
      );
      return interaction.reply
        ? interaction.reply(payload)
        : interaction.message?.reply(payload);
    }

    await disownChild(serverId, author.id, targetUser.id);
    const content = `### 🚪 Disowned!\n\n<@${author.id}> has officially disowned <@${targetUser.id}> and kicked them out of the family tree!`;
    const payload = buildCard(content, 0xed4245);

    if (interaction.reply) {
      await interaction.reply(payload);
    } else {
      await interaction.message?.reply(payload);
    }
  } catch (err) {
    logger.error("Error in Disown command execution:", err);
    Sentry.captureException(err);
  }
}
