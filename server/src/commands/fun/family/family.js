import logger from "../../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getAllSiblings, getFullFamilyNetwork } from "../../../services/database.js";

export const data = {
  name: "family",
  description: "View family relations.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to inspect.",
      type: 6,
      required: false,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    if (interaction.deferReply) {
      await interaction.deferReply().catch(() => null);
    }

    const targetUser =
      interaction.options?.getUser("user") ||
      interaction.mentions?.users?.first() ||
      interaction.user ||
      interaction.author;

    const serverId = interaction.guild?.id;

    if (!serverId) {
      const errorPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0xed4245,
            components: [{ type: 10, content: "This command can only be used in a server!" }],
          },
        ],
      };
      return interaction.editReply ? interaction.editReply(errorPayload) : interaction.reply(errorPayload);
    }

    const network = await getFullFamilyNetwork(serverId, targetUser.id);
    const memberIds = Object.keys(network);

    const fetchUserSafe = async (id) => {
      if (interaction.guild) {
        const member = await interaction.guild.members.fetch({ user: id, force: true }).catch(() => null);
        if (member) return member;
      }
      return client.users.fetch(id, { force: true }).catch(() => null);
    };

    const userMap = {};
    await Promise.all(
      memberIds.map(async (id) => {
        const u = await fetchUserSafe(id);
        if (u) userMap[id] = u;
      }),
    );
    if (interaction.member) {
      userMap[targetUser.id] = interaction.member;
    } else {
      userMap[targetUser.id] = targetUser;
    }

    const directFamily = network[targetUser.id] || { partnerId: null, parentIds: [], stepParentIds: [], childrenIds: [] };
    const siblings = await getAllSiblings(serverId, targetUser.id);

    const partnerUser = directFamily.partnerId ? userMap[directFamily.partnerId] : null;
    const parentsUsers = (directFamily.parentIds || []).map((id) => userMap[id]).filter(Boolean);
    const stepParentsUsers = (directFamily.stepParentIds || []).map((id) => userMap[id]).filter(Boolean);
    const childrenUsers = (directFamily.childrenIds || []).map((id) => userMap[id]).filter(Boolean);
    const siblingsUsers = siblings.map((id) => userMap[id]).filter(Boolean);

    const spouseText = partnerUser
      ? `<@${partnerUser.id}>${directFamily.marriedAt ? ` (Married <t:${directFamily.marriedAt}:R>)` : ""}`
      : "*None*";

    const parentLabel = parentsUsers.length === 1 ? "Parent" : "Parents";
    const stepParentLabel = stepParentsUsers.length === 1 ? "Step-Parent" : "Step-Parents";
    const childLabel = childrenUsers.length === 1 ? "Child" : "Children";
    const siblingLabel = siblingsUsers.length === 1 ? "Sibling" : "Siblings";

    const parentsText = parentsUsers.length > 0
      ? parentsUsers.map((p) => `<@${p.id}>`).join(", ")
      : "*None*";

    const stepParentsText = stepParentsUsers.length > 0
      ? `\n> 🫂 **${stepParentLabel}:** ${stepParentsUsers.map((p) => `<@${p.id}>`).join(", ")}`
      : "";

    const childrenText = childrenUsers.length > 0
      ? childrenUsers.map((c) => `<@${c.id}>`).join(", ")
      : "*None*";

    const siblingsText = siblingsUsers.length > 0
      ? siblingsUsers.map((s) => `<@${s.id}>`).join(", ")
      : "*None*";

    const contentText =
      `### 🌳 Family: ${targetUser.displayName || targetUser.username}\n\n` +
      `> 💍 **Spouse:** ${spouseText}\n` +
      `> 👨‍👩‍👧 **${parentLabel}:** ${parentsText}${stepParentsText}\n` +
      `> 🧒 **${childLabel} (${childrenUsers.length}):** ${childrenText}\n` +
      `> 👥 **${siblingLabel} (${siblingsUsers.length}):** ${siblingsText}\n` +
      `> 🌐 **Total Connected Family:** ${memberIds.length} members`

    const payload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 0x6366f1,
          components: [
            {
              type: 10,
              content: contentText,
            },
          ],
        },
      ],
    };

    if (interaction.editReply) {
      await interaction.editReply(payload);
    } else if (interaction.reply) {
      await interaction.reply(payload);
    } else {
      await interaction.message?.reply(payload);
    }
  } catch (err) {
    logger.error("Error in Family command execution:", err);
    Sentry.captureException(err);
    const errPayload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 0xed4245,
          components: [{ type: 10, content: "Failed to load family information. Try again!" }],
        },
      ],
    };
    if (interaction.editReply) {
      await interaction.editReply(errPayload).catch(() => null);
    } else if (interaction.reply) {
      await interaction.reply({ ...errPayload, ephemeral: true }).catch(() => null);
    }
  }
}
