import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, disownChild } from "../../services/database.js";

export const data = {
  name: "runaway",
  description: "Run away from your parents.",
  dm_permission: false,
  options: [
    {
      name: "parent",
      description: "Specific parent to run away from (leave empty to leave both).",
      type: 6,
      required: false,
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
      const payload = buildCard("This command can only be used inside a server!");
      return interaction.reply ? interaction.reply(payload) : interaction.message?.reply(payload);
    }

    const authorFam = await getUserFamily(serverId, author.id);
    const allParentIds = Array.from(new Set([...(authorFam.parentIds || []), ...(authorFam.stepParentIds || [])]));

    if (allParentIds.length === 0) {
      const payload = buildCard("You don't have any parents to leave! You are already independent.", 0xffa502);
      return interaction.reply ? interaction.reply(payload) : interaction.message?.reply(payload);
    }

    const specificParent =
      interaction.options?.getUser("parent") ||
      interaction.mentions?.users?.first();

    let formerParents = [];

    if (specificParent) {
      if (!allParentIds.includes(specificParent.id)) {
        const payload = buildCard(`<@${specificParent.id}> is not your parent or step-parent!`, 0xffa502);
        return interaction.reply ? interaction.reply(payload) : interaction.message?.reply(payload);
      }
      formerParents = [specificParent.id];
      await disownChild(serverId, specificParent.id, author.id);
    } else {
      formerParents = [...allParentIds];
      for (const pId of formerParents) {
        await disownChild(serverId, pId, author.id);
      }
    }

    const parentsMentions = formerParents.map((id) => `<@${id}>`).join(" & ");
    const content = `### 🏃 Emancipated!\n\n<@${author.id}> packed their bags, ran away, and officially left ${parentsMentions}!`;
    const payload = buildCard(content, 0x2ecc71);

    if (interaction.reply) {
      await interaction.reply(payload);
    } else {
      await interaction.message?.reply(payload);
    }
  } catch (err) {
    logger.error("Error in Runaway command execution:", err);
    Sentry.captureException(err);
  }
}
