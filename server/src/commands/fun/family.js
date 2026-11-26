import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getUserFamily, getAllSiblings } from "../../services/database.js";

export const data = {
  name: "family",
  description: "View a user's family tree.",
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

function truncateName(name, maxLen = 14) {
  if (!name) return "Unknown";
  return name.length > maxLen ? name.substring(0, maxLen - 1) + "…" : name;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x + radius, y);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function renderFamilyCanvas(targetUser, partnerUser, parentsUsers, childrenUsers) {
  const width = 1600;
  const height = 900;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#080d1a");
  bg.addColorStop(0.5, "#131338");
  bg.addColorStop(1, "#05070f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const radialGlow = ctx.createRadialGradient(800, 450, 50, 800, 450, 700);
  radialGlow.addColorStop(0, "rgba(99, 102, 241, 0.12)");
  radialGlow.addColorStop(0.6, "rgba(147, 51, 234, 0.05)");
  radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  async function drawNode(user, x, y, label, borderColor = "#6366f1", glowColor = "rgba(99, 102, 241, 0.4)") {
    const cardW = 280;
    const cardH = 110;
    const cardX = x - cardW / 2;
    const cardY = y - cardH / 2;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(22, 27, 46, 0.92)";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const innerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    innerGrad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
    innerGrad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
    ctx.fillStyle = innerGrad;
    drawRoundedRect(ctx, cardX + 2, cardY + 2, cardW - 4, cardH - 4, 18);
    ctx.fill();

    if (user) {
      try {
        const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
        const img = await loadImage(avatarUrl).catch(() => null);
        if (img) {
          ctx.save();
          const avatarSize = 74;
          const avatarX = cardX + 18;
          const avatarY = cardY + (cardH - avatarSize) / 2;

          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.restore();
        }
      } catch (e) {}

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 23px sans-serif";
      ctx.fillText(truncateName(user.displayName || user.username, 12), cardX + 106, cardY + 48);

      ctx.fillStyle = borderColor;
      ctx.font = "700 18px sans-serif";
      ctx.fillText(label, cardX + 106, cardY + 78);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "italic 20px sans-serif";
      ctx.fillText("None", cardX + 115, cardY + 62);
    }
  }

  function drawLine(x1, y1, x2, y2, color = "rgba(129, 140, 248, 0.65)") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();
  }

  const centerY = 450;
  const mainX = partnerUser ? 620 : 800;

  await drawNode(targetUser, mainX, centerY, "Root", "#6366f1", "rgba(99, 102, 241, 0.6)");

  if (partnerUser) {
    const partnerX = 980;
    drawLine(mainX + 140, centerY, partnerX - 140, centerY, "#ec4899");
    await drawNode(partnerUser, partnerX, centerY, "Spouse 💍", "#ec4899", "rgba(236, 72, 153, 0.6)");
  }

  const parentsY = 160;
  if (parentsUsers.length > 0) {
    if (parentsUsers.length === 1) {
      drawLine(mainX, centerY - 55, mainX, parentsY + 55, "#38bdf8");
      await drawNode(parentsUsers[0], mainX, parentsY, "Parent 👨‍👧", "#38bdf8", "rgba(56, 189, 248, 0.6)");
    } else {
      const p1X = mainX - 180;
      const p2X = mainX + 180;
      drawLine(mainX, centerY - 55, p1X, parentsY + 55, "#38bdf8");
      drawLine(mainX, centerY - 55, p2X, parentsY + 55, "#38bdf8");
      await drawNode(parentsUsers[0], p1X, parentsY, "Parent 1", "#38bdf8", "rgba(56, 189, 248, 0.6)");
      await drawNode(parentsUsers[1], p2X, parentsY, "Parent 2", "#38bdf8", "rgba(56, 189, 248, 0.6)");
    }
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "italic 20px sans-serif";
    ctx.fillText("No Parents Registered", mainX - 110, parentsY + 15);
  }

  const childrenY = 740;
  const numChildren = Math.min(childrenUsers.length, 4);
  if (numChildren > 0) {
    const spacing = 320;
    const startX = 800 - ((numChildren - 1) * spacing) / 2;
    const parentConnectX = partnerUser ? 800 : mainX;
    for (let i = 0; i < numChildren; i++) {
      const childX = startX + i * spacing;
      drawLine(parentConnectX, centerY + 55, childX, childrenY - 55, "#10b981");
      await drawNode(childrenUsers[i], childX, childrenY, "Child 👶", "#10b981", "rgba(16, 185, 129, 0.6)");
    }
    if (childrenUsers.length > 4) {
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`+${childrenUsers.length - 4} more children`, 1340, childrenY + 10);
    }
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "italic 20px sans-serif";
    ctx.fillText("No Children Registered", (partnerUser ? 800 : mainX) - 105, childrenY - 5);
  }

  return canvas.toBuffer("image/png");
}

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

    const family = await getUserFamily(serverId, targetUser.id);
    const siblings = await getAllSiblings(serverId, targetUser.id);

    const fetchUserSafe = async (id) => client.users.fetch(id).catch(() => null);

    const partnerUser = family.partnerId ? await fetchUserSafe(family.partnerId) : null;
    const parentsUsers = (await Promise.all(family.parentIds.map(fetchUserSafe))).filter(Boolean);
    const childrenUsers = (await Promise.all(family.childrenIds.map(fetchUserSafe))).filter(Boolean);
    const siblingsUsers = (await Promise.all(siblings.map(fetchUserSafe))).filter(Boolean);

    const spouseText = partnerUser
      ? `<@${partnerUser.id}>${family.marriedAt ? ` (Married <t:${family.marriedAt}:R>)` : ""}`
      : "*None*";

    const parentsText = parentsUsers.length > 0
      ? parentsUsers.map((p) => `<@${p.id}>`).join(", ")
      : "*None*";

    const childrenText = childrenUsers.length > 0
      ? childrenUsers.map((c) => `<@${c.id}>`).join(", ")
      : "*None*";

    const siblingsText = siblingsUsers.length > 0
      ? siblingsUsers.map((s) => `<@${s.id}>`).join(", ")
      : "*None*";

    const canvasBuffer = await renderFamilyCanvas(targetUser, partnerUser, parentsUsers, childrenUsers);
    const attachment = new AttachmentBuilder(canvasBuffer, { name: "family-tree.png" });

    const contentText =
      `### 🌳 Family Tree: ${targetUser.displayName || targetUser.username}\n\n` +
      `> 💍 **Spouse:** ${spouseText}\n` +
      `> 👨‍👩‍👧 **Parents:** ${parentsText}\n` +
      `> 👶 **Children (${childrenUsers.length}):** ${childrenText}\n` +
      `> 👥 **Siblings (${siblingsUsers.length}):** ${siblingsText}`;

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
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 12,
              items: [
                {
                  media: {
                    url: "attachment://family-tree.png",
                  },
                  description: "Family Tree Graph",
                },
              ],
            },
          ],
        },
      ],
      files: [attachment],
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
          components: [{ type: 10, content: "Failed to load family tree. Try again!" }],
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
