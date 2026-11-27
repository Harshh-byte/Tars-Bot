import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import logger from "../../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getAllSiblings, getFullFamilyNetwork } from "../../../services/database.js";

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
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

async function renderFullFamilyCanvas(rootUserId, network, userMap) {
  const memberIds = Object.keys(network);
  if (memberIds.length === 0) {
    memberIds.push(rootUserId);
  }

  const generations = {};
  generations[rootUserId] = 0;
  const q = [rootUserId];

  while (q.length > 0) {
    const curId = q.shift();
    const curGen = generations[curId];
    const fam = network[curId] || { parentIds: [], childrenIds: [], partnerId: null };

    if (fam.partnerId && generations[fam.partnerId] === undefined) {
      generations[fam.partnerId] = curGen;
      q.push(fam.partnerId);
    }

    if (Array.isArray(fam.parentIds)) {
      for (const pId of fam.parentIds) {
        if (generations[pId] === undefined) {
          generations[pId] = curGen - 1;
          q.push(pId);
        }
      }
    }

    if (Array.isArray(fam.childrenIds)) {
      for (const cId of fam.childrenIds) {
        if (generations[cId] === undefined) {
          generations[cId] = curGen + 1;
          q.push(cId);
        }
      }
    }
  }

  for (const mId of memberIds) {
    if (generations[mId] === undefined) {
      generations[mId] = 0;
    }
  }

  const allGens = Object.values(generations);
  const minGen = Math.min(...allGens);
  const normalizedGens = {};
  for (const [mId, g] of Object.entries(generations)) {
    normalizedGens[mId] = g - minGen;
  }

  const genLevels = {};
  for (const [mId, g] of Object.entries(normalizedGens)) {
    if (!genLevels[g]) genLevels[g] = [];
    genLevels[g].push(mId);
  }

  const sortedGens = Object.keys(genLevels).map(Number).sort((a, b) => a - b);
  const totalGenerations = sortedGens.length;

  for (const g of sortedGens) {
    const list = genLevels[g];
    const ordered = [];
    const added = new Set();

    list.sort((a, b) => {
      const aPartner = network[a]?.partnerId;
      const bPartner = network[b]?.partnerId;
      if (aPartner && !bPartner) return -1;
      if (!aPartner && bPartner) return 1;
      return a.localeCompare(b);
    });

    for (const mId of list) {
      if (added.has(mId)) continue;
      ordered.push(mId);
      added.add(mId);
      const partner = network[mId]?.partnerId;
      if (partner && list.includes(partner) && !added.has(partner)) {
        ordered.push(partner);
        added.add(partner);
      }
    }
    genLevels[g] = ordered;
  }

  const maxItemsInGen = Math.max(...sortedGens.map((g) => genLevels[g].length), 1);
  const cardW = 340;
  const cardH = 130;
  const xSpacing = 390;
  const ySpacing = 250;

  const width = Math.max(1600, maxItemsInGen * xSpacing + 200);
  const height = Math.max(900, totalGenerations * ySpacing + 200);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#080d1a");
  bg.addColorStop(0.5, "#131338");
  bg.addColorStop(1, "#05070f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) / 1.5);
  radialGlow.addColorStop(0, "rgba(99, 102, 241, 0.15)");
  radialGlow.addColorStop(0.6, "rgba(147, 51, 234, 0.06)");
  radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  async function drawNode(user, x, y, label, borderColor, glowColor) {
    const cardX = x - cardW / 2;
    const cardY = y - cardH / 2;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(20, 24, 40, 0.94)";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const innerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    innerGrad.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    innerGrad.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = innerGrad;
    drawRoundedRect(ctx, cardX + 2, cardY + 2, cardW - 4, cardH - 4, 20);
    ctx.fill();

    if (user) {
      try {
        const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
        const img = await loadImage(avatarUrl).catch(() => null);
        if (img) {
          ctx.save();
          const avatarSize = 88;
          const avatarX = cardX + 20;
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
      ctx.font = "bold 25px sans-serif";
      ctx.fillText(truncateName(user.displayName || user.username, 13), cardX + 126, cardY + 54);

      ctx.fillStyle = borderColor;
      ctx.font = "700 19px sans-serif";
      ctx.fillText(label, cardX + 126, cardY + 90);
    }
  }

  function drawStraightLine(x1, y1, x2, y2, color = "rgba(129, 140, 248, 0.65)") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();
  }

  const positions = {};
  const totalGenHeight = (totalGenerations - 1) * ySpacing;
  const startY = (height - totalGenHeight) / 2;

  sortedGens.forEach((g, gIdx) => {
    const list = genLevels[g];
    const genY = startY + gIdx * ySpacing;
    const totalGenWidth = (list.length - 1) * xSpacing;
    const genStartX = (width - totalGenWidth) / 2;

    list.forEach((mId, mIdx) => {
      positions[mId] = {
        x: genStartX + mIdx * xSpacing,
        y: genY,
      };
    });
  });

  const drawnSpouses = new Set();
  for (const mId of memberIds) {
    const fam = network[mId];
    if (fam?.partnerId && !drawnSpouses.has(mId) && positions[mId] && positions[fam.partnerId]) {
      const posA = positions[mId];
      const posB = positions[fam.partnerId];
      const leftPos = posA.x < posB.x ? posA : posB;
      const rightPos = posA.x < posB.x ? posB : posA;
      drawStraightLine(leftPos.x + cardW / 2, leftPos.y, rightPos.x - cardW / 2, rightPos.y, "#ec4899");
      drawnSpouses.add(mId);
      drawnSpouses.add(fam.partnerId);
    }
  }

  const processedCouples = new Set();
  for (const mId of memberIds) {
    const fam = network[mId];
    if (!fam || !Array.isArray(fam.childrenIds) || fam.childrenIds.length === 0) continue;

    const coupleKey = [mId, fam.partnerId].filter(Boolean).sort().join("_");
    if (processedCouples.has(coupleKey)) continue;
    processedCouples.add(coupleKey);

    const parentPos = positions[mId];
    if (!parentPos) continue;

    let parentConnectX = parentPos.x;
    let parentConnectY = parentPos.y + cardH / 2;

    if (fam.partnerId && positions[fam.partnerId]) {
      parentConnectX = (parentPos.x + positions[fam.partnerId].x) / 2;
    }

    const validChildren = fam.childrenIds.filter((cId) => positions[cId]);
    if (validChildren.length === 0) continue;

    const childXs = validChildren.map((cId) => positions[cId].x);
    const minChildX = Math.min(...childXs);
    const maxChildX = Math.max(...childXs);
    const firstChildY = positions[validChildren[0]].y - cardH / 2;

    const midY = (parentConnectY + firstChildY) / 2;

    drawStraightLine(parentConnectX, parentConnectY, parentConnectX, midY, "#10b981");

    if (validChildren.length > 1) {
      const busStartX = Math.min(parentConnectX, minChildX);
      const busEndX = Math.max(parentConnectX, maxChildX);
      drawStraightLine(busStartX, midY, busEndX, midY, "#10b981");
    } else if (parentConnectX !== minChildX) {
      drawStraightLine(parentConnectX, midY, minChildX, midY, "#10b981");
    }

    for (const cId of validChildren) {
      const cPos = positions[cId];
      drawStraightLine(cPos.x, midY, cPos.x, firstChildY, "#10b981");
    }
  }

  const rootGen = normalizedGens[rootUserId];
  for (const mId of memberIds) {
    const pos = positions[mId];
    if (!pos) continue;

    const u = userMap[mId];
    const fam = network[mId] || {};
    const genDiff = normalizedGens[mId] - rootGen;

    let roleLabel = "Family";
    let color = "#6366f1";
    let glow = "rgba(99, 102, 241, 0.5)";

    if (mId === rootUserId) {
      roleLabel = "Root";
      color = "#6366f1";
      glow = "rgba(99, 102, 241, 0.7)";
    } else if (fam.partnerId === rootUserId || network[rootUserId]?.partnerId === mId) {
      roleLabel = "Spouse";
      color = "#ec4899";
      glow = "rgba(236, 72, 153, 0.6)";
    } else if (network[rootUserId]?.parentIds?.includes(mId)) {
      roleLabel = "Parent";
      color = "#38bdf8";
      glow = "rgba(56, 189, 248, 0.6)";
    } else if (network[rootUserId]?.stepParentIds?.includes(mId)) {
      roleLabel = "Step-Parent";
      color = "#0284c7";
      glow = "rgba(2, 132, 199, 0.6)";
    } else if (network[rootUserId]?.childrenIds?.includes(mId)) {
      roleLabel = "Child";
      color = "#10b981";
      glow = "rgba(16, 185, 129, 0.6)";
    } else if (genDiff === 0) {
      const shareParent = network[rootUserId]?.parentIds?.some((p) => fam.parentIds?.includes(p));
      if (shareParent) {
        roleLabel = "Sibling";
        color = "#a855f7";
        glow = "rgba(168, 85, 247, 0.6)";
      } else {
        roleLabel = "In-Law";
        color = "#e879f9";
        glow = "rgba(232, 121, 249, 0.5)";
      }
    } else if (genDiff === -1) {
      roleLabel = "Parent / In-Law";
      color = "#38bdf8";
      glow = "rgba(56, 189, 248, 0.6)";
    } else if (genDiff <= -2) {
      roleLabel = genDiff === -2 ? "Grandparent" : "Ancestor";
      color = "#f59e0b";
      glow = "rgba(245, 158, 11, 0.6)";
    } else if (genDiff === 1) {
      roleLabel = "Next Gen";
      color = "#10b981";
      glow = "rgba(16, 185, 129, 0.6)";
    } else if (genDiff >= 2) {
      roleLabel = genDiff === 2 ? "Grandchild" : "Descendant";
      color = "#34d399";
      glow = "rgba(52, 211, 153, 0.6)";
    }

    await drawNode(u, pos.x, pos.y, roleLabel, color, glow);
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

    const network = await getFullFamilyNetwork(serverId, targetUser.id);
    const memberIds = Object.keys(network);

    const fetchUserSafe = async (id) => client.users.fetch(id).catch(() => null);
    const userMap = {};
    await Promise.all(
      memberIds.map(async (id) => {
        const u = await fetchUserSafe(id);
        if (u) userMap[id] = u;
      }),
    );
    userMap[targetUser.id] = targetUser;

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

    const canvasBuffer = await renderFullFamilyCanvas(targetUser.id, network, userMap);
    const attachment = new AttachmentBuilder(canvasBuffer, { name: "family-tree.png" });

    const contentText =
      `### 🌳 Family Tree: ${targetUser.displayName || targetUser.username}\n\n` +
      `> 💍 **Spouse:** ${spouseText}\n` +
      `> 👨‍👩‍👧 **${parentLabel}:** ${parentsText}${stepParentsText}\n` +
      `> 🧒 **${childLabel} (${childrenUsers.length}):** ${childrenText}\n` +
      `> 👥 **${siblingLabel} (${siblingsUsers.length}):** ${siblingsText}\n` +
      `> 🌐 **Total Connected Family:** ${memberIds.length} members`;

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
