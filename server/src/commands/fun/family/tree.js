import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import path from "node:path";
import logger from "../../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { getFullFamilyNetwork } from "../../../services/database.js";

export const data = {
  name: "tree",
  description: "View family tree.",
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
  ctx.arcTo(x, y + radius, x + radius, y, radius);
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

  let genAdjusted = true;
  let iterations = 0;
  while (genAdjusted && iterations < 30) {
    genAdjusted = false;
    iterations++;

    for (const mId of memberIds) {
      const fam = network[mId] || {};

      if (fam.partnerId && memberIds.includes(fam.partnerId)) {
        if (generations[fam.partnerId] !== generations[mId]) {
          const maxG = Math.max(generations[fam.partnerId], generations[mId]);
          generations[mId] = maxG;
          generations[fam.partnerId] = maxG;
          genAdjusted = true;
        }
      }

      if (Array.isArray(fam.parentIds) && fam.parentIds.length > 0) {
        const parentsInNet = fam.parentIds.filter((p) => memberIds.includes(p));
        if (parentsInNet.length > 0) {
          const highestParentGen = Math.max(...parentsInNet.map((p) => generations[p] ?? 0));
          if (generations[mId] <= highestParentGen) {
            generations[mId] = highestParentGen + 1;
            if (fam.partnerId && memberIds.includes(fam.partnerId)) {
              generations[fam.partnerId] = generations[mId];
            }
            genAdjusted = true;
          }
        }
      }
    }
  }

  const allGens = Object.values(generations);
  const minGen = Math.min(...allGens);
  const normalizedGens = {};
  for (const [mId, g] of Object.entries(generations)) {
    normalizedGens[mId] = g - minGen;
  }

  const avatarSize = 88;
  const unitGap = 130;
  const coupleInnerGap = 72;
  const branchSpacing = 60;
  const ySpacing = 220;

  const nodeUnitMap = {};
  const allUnits = [];
  const processedUnits = new Set();

  for (const mId of memberIds) {
    if (processedUnits.has(mId)) continue;
    const fam = network[mId] || {};
    const partner = fam.partnerId;

    if (partner && memberIds.includes(partner)) {
      processedUnits.add(mId);
      processedUnits.add(partner);
      const unit = {
        id: `couple_${mId}_${partner}`,
        isCouple: true,
        members: [mId, partner],
        gen: normalizedGens[mId],
        children: [],
        parents: [],
        x: 0,
        y: 0,
        subtreeWidth: 0,
      };
      nodeUnitMap[mId] = unit;
      nodeUnitMap[partner] = unit;
      allUnits.push(unit);
    } else {
      processedUnits.add(mId);
      const unit = {
        id: `single_${mId}`,
        isCouple: false,
        members: [mId],
        gen: normalizedGens[mId],
        children: [],
        parents: [],
        x: 0,
        y: 0,
        subtreeWidth: 0,
      };
      nodeUnitMap[mId] = unit;
      allUnits.push(unit);
    }
  }

  for (const unit of allUnits) {
    const rawChildren = new Set();
    const rawParents = new Set();

    for (const mId of unit.members) {
      const fam = network[mId] || {};
      for (const cId of fam.childrenIds || []) {
        if (memberIds.includes(cId)) rawChildren.add(cId);
      }
      for (const pId of fam.parentIds || []) {
        if (memberIds.includes(pId)) rawParents.add(pId);
      }
    }

    const childUnitsSet = new Set();
    for (const cId of rawChildren) {
      const cu = nodeUnitMap[cId];
      if (cu && cu !== unit && cu.gen === unit.gen + 1) childUnitsSet.add(cu);
    }
    unit.children = Array.from(childUnitsSet);

    const parentUnitsSet = new Set();
    for (const pId of rawParents) {
      const pu = nodeUnitMap[pId];
      if (pu && pu !== unit && pu.gen === unit.gen - 1) parentUnitsSet.add(pu);
    }
    unit.parents = Array.from(parentUnitsSet);
  }

  for (const unit of allUnits) {
    unit.nodeWidth = unit.isCouple ? avatarSize * 2 + coupleInnerGap : avatarSize;
  }

  const rootUnits = allUnits.filter((u) => u.parents.length === 0);
  if (rootUnits.length === 0 && allUnits.length > 0) {
    rootUnits.push(allUnits[0]);
  }

  const visitedSubtree = new Set();
  function computeSubtreeWidth(unit) {
    if (visitedSubtree.has(unit)) return unit.subtreeWidth;
    visitedSubtree.add(unit);

    if (unit.children.length === 0) {
      unit.subtreeWidth = unit.nodeWidth + unitGap;
      return unit.subtreeWidth;
    }

    let childrenSum = 0;
    for (const child of unit.children) {
      childrenSum += computeSubtreeWidth(child);
    }

    unit.subtreeWidth = Math.max(unit.nodeWidth + unitGap, childrenSum);
    return unit.subtreeWidth;
  }

  for (const ru of rootUnits) {
    computeSubtreeWidth(ru);
  }
  for (const u of allUnits) {
    if (!visitedSubtree.has(u)) {
      computeSubtreeWidth(u);
    }
  }

  const placedUnits = new Set();
  function placeUnitHierarchy(unit, leftX) {
    if (placedUnits.has(unit)) return;
    placedUnits.add(unit);

    if (unit.children.length === 0) {
      unit.x = leftX + unit.subtreeWidth / 2;
      return;
    }

    let curChildX = leftX;
    for (const child of unit.children) {
      placeUnitHierarchy(child, curChildX);
      curChildX += child.subtreeWidth;
    }

    const firstChild = unit.children[0];
    const lastChild = unit.children[unit.children.length - 1];
    unit.x = (firstChild.x + lastChild.x) / 2;
  }

  let curRootX = 0;
  for (const ru of rootUnits) {
    placeUnitHierarchy(ru, curRootX);
    curRootX += ru.subtreeWidth + branchSpacing;
  }

  for (const u of allUnits) {
    if (!placedUnits.has(u)) {
      placeUnitHierarchy(u, curRootX);
      curRootX += u.subtreeWidth + branchSpacing;
    }
  }

  const unitsByGen = {};
  for (const unit of allUnits) {
    if (!unitsByGen[unit.gen]) unitsByGen[unit.gen] = [];
    unitsByGen[unit.gen].push(unit);
  }

  const sortedGenKeys = Object.keys(unitsByGen).map(Number).sort((a, b) => a - b);

  for (let pass = 0; pass < 5; pass++) {
    for (const g of sortedGenKeys) {
      const row = unitsByGen[g];
      row.sort((a, b) => a.x - b.x);

      for (let i = 0; i < row.length - 1; i++) {
        const uA = row[i];
        const uB = row[i + 1];
        const minGap = (uA.nodeWidth + uB.nodeWidth) / 2 + 50;
        if (uB.x - uA.x < minGap) {
          const shift = minGap - (uB.x - uA.x);
          uB.x += shift;
          for (let k = i + 2; k < row.length; k++) {
            row[k].x += shift;
          }
        }
      }
    }
  }

  const allXPositions = [];
  const positions = {};

  for (const unit of allUnits) {
    if (unit.isCouple) {
      const halfDist = (avatarSize + coupleInnerGap) / 2;
      const m1 = unit.members[0];
      const m2 = unit.members[1];
      positions[m1] = { x: unit.x - halfDist, y: 0 };
      positions[m2] = { x: unit.x + halfDist, y: 0 };
      allXPositions.push(unit.x - halfDist, unit.x + halfDist);
    } else {
      const m = unit.members[0];
      positions[m] = { x: unit.x, y: 0 };
      allXPositions.push(unit.x);
    }
  }

  const minX = Math.min(...allXPositions);
  const maxX = Math.max(...allXPositions);
  const totalContentWidth = maxX - minX;

  const canvasWidth = Math.max(1600, totalContentWidth + 360);
  const totalGenerations = sortedGenKeys.length;
  const canvasHeight = Math.max(900, (totalGenerations - 1) * ySpacing + 380);

  const startY = 170 + Math.max(0, (canvasHeight - 260 - (totalGenerations - 1) * ySpacing) / 2);
  const xOffset = (canvasWidth - totalContentWidth) / 2 - minX;

  for (const unit of allUnits) {
    const unitY = startY + unit.gen * ySpacing;
    unit.y = unitY;
    unit.x += xOffset;

    if (unit.isCouple) {
      const halfDist = (avatarSize + coupleInnerGap) / 2;
      const m1 = unit.members[0];
      const m2 = unit.members[1];
      positions[m1] = { x: unit.x - halfDist, y: unitY };
      positions[m2] = { x: unit.x + halfDist, y: unitY };
    } else {
      const m = unit.members[0];
      positions[m] = { x: unit.x, y: unitY };
    }
  }

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c0d10";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const rootUserObj = userMap[rootUserId];
  const rootName = rootUserObj?.displayName || rootUserObj?.nickname || rootUserObj?.user?.displayName || rootUserObj?.username || "User";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(`${rootName}'s family tree`, 60, 68);

  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.font = "18px sans-serif";
  ctx.fillText(`Showing ${memberIds.length} people.`, 60, 100);

  try {
    const iconPath = path.resolve(process.cwd(), "../assets/Icon.png");
    const tarsIcon = await loadImage(iconPath).catch(async () => {
      const fallbackPath = path.resolve(process.cwd(), "assets/Icon.png");
      return loadImage(fallbackPath).catch(() => null);
    });
    if (tarsIcon) {
      const iconSize = 44;
      const iconX = canvasWidth - 60 - iconSize;
      const iconY = 60;
      const iconRadius = 12;

      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
      ctx.clip();
      ctx.drawImage(tarsIcon, iconX, iconY, iconSize, iconSize);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  } catch (e) {}

  function drawStraightLine(x1, y1, x2, y2, color = "rgba(255, 255, 255, 0.15)") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawHeart(x, y, scale = 1.1, color = "#ff4d88") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.bezierCurveTo(-1.5, -10, -10, -10, -10, -3);
    ctx.bezierCurveTo(-10, 3, -4, 8, 0, 13);
    ctx.bezierCurveTo(4, 8, 10, 3, 10, -3);
    ctx.bezierCurveTo(10, -10, 1.5, -10, 0, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const unit of allUnits) {
    if (unit.isCouple) {
      const p1 = positions[unit.members[0]];
      const p2 = positions[unit.members[1]];
      const leftP = p1.x < p2.x ? p1 : p2;
      const rightP = p1.x < p2.x ? p2 : p1;

      drawStraightLine(leftP.x + avatarSize / 2, leftP.y, unit.x - 14, leftP.y, "rgba(255, 77, 136, 0.7)");
      drawHeart(unit.x, leftP.y, 1.25, "#ff4d88");
      drawStraightLine(unit.x + 14, rightP.y, rightP.x - avatarSize / 2, rightP.y, "rgba(255, 77, 136, 0.7)");
    }
  }

  const drawnBranches = new Set();
  for (const parentUnit of allUnits) {
    if (!parentUnit.children || parentUnit.children.length === 0) continue;

    const branchKey = `${parentUnit.id}->${parentUnit.children.map((c) => c.id).sort().join(",")}`;
    if (drawnBranches.has(branchKey)) continue;
    drawnBranches.add(branchKey);

    const parentConnectX = parentUnit.x;
    const parentConnectY = parentUnit.y + avatarSize / 2;

    const childY = parentUnit.children[0].y - avatarSize / 2;
    const midY = (parentConnectY + childY) / 2;

    const childXs = parentUnit.children.map((c) => {
      if (c.isCouple) {
        const inLaws = c.members.filter((m) => {
          const fam = network[m] || {};
          return (fam.parentIds || []).some((pid) => parentUnit.members.includes(pid));
        });
        if (inLaws.length > 0 && positions[inLaws[0]]) {
          return positions[inLaws[0]].x;
        }
      } else {
        const singleMember = c.members[0];
        if (positions[singleMember]) {
          return positions[singleMember].x;
        }
      }
      return c.x;
    });

    const minChildX = Math.min(...childXs);
    const maxChildX = Math.max(...childXs);

    const busLeft = Math.min(parentConnectX, minChildX);
    const busRight = Math.max(parentConnectX, maxChildX);

    drawStraightLine(parentConnectX, parentConnectY, parentConnectX, midY, "rgba(255, 255, 255, 0.2)");

    if (busRight > busLeft) {
      drawStraightLine(busLeft, midY, busRight, midY, "rgba(255, 255, 255, 0.2)");
    }

    for (let i = 0; i < parentUnit.children.length; i++) {
      const cUnit = parentUnit.children[i];
      const cx = childXs[i];
      const targetChildY = cUnit.y - avatarSize / 2;
      drawStraightLine(cx, midY, cx, targetChildY, "rgba(255, 255, 255, 0.2)");
    }
  }

  async function drawAvatarNode(user, x, y, borderColor, glowColor) {
    const radius = avatarSize / 2;

    ctx.save();
    ctx.shadowColor = glowColor || borderColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20, 24, 40, 0.94)";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.restore();

    let img = null;
    let displayName = "Unknown user";

    if (user) {
      displayName = user.displayName || user.nickname || user.user?.displayName || user.user?.username || user.username || "Unknown user";

      try {
        const avatarUrl = user.cachedAvatarUrl || ((typeof user.displayAvatarURL === "function")
          ? user.displayAvatarURL({ extension: "png", size: 128 })
          : (user.user ? user.user.displayAvatarURL({ extension: "png", size: 128 }) : null));

        if (user.cachedAvatarImg) {
          img = user.cachedAvatarImg;
        } else if (avatarUrl) {
          img = await loadImage(avatarUrl).catch(() => null);
        }
      } catch (e) {}
    }

    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - radius, y - radius, avatarSize, avatarSize);
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#1e2433";
      ctx.fill();

      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.arc(x, y - 8, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y + 26, 26, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(truncateName(displayName, 14), x, y + radius + 26);
    ctx.restore();
  }

  const rootFam = network[rootUserId] || {};
  const directParents = rootFam.parentIds || [];
  const directChildren = rootFam.childrenIds || [];

  const grandParentSet = new Set();
  for (const pId of directParents) {
    const pFam = network[pId] || {};
    for (const gpId of pFam.parentIds || []) {
      if (memberIds.includes(gpId)) grandParentSet.add(gpId);
    }
  }

  const grandChildSet = new Set();
  for (const cId of directChildren) {
    const cFam = network[cId] || {};
    for (const gcId of cFam.childrenIds || []) {
      if (memberIds.includes(gcId)) grandChildSet.add(gcId);
    }
  }

  for (const mId of memberIds) {
    const pos = positions[mId];
    if (!pos) continue;

    const u = userMap[mId];
    const fam = network[mId] || {};

    let borderColor = "#64748b";
    let glow = "rgba(100, 116, 139, 0.4)";

    const isDirectChild = directChildren.includes(mId);
    const isDirectParent = directParents.includes(mId);
    const isDirectStepParent = (rootFam.stepParentIds || []).includes(mId);
    const isDirectSpouse = fam.partnerId === rootUserId || rootFam.partnerId === mId;
    const isSibling = directParents.some((p) => (fam.parentIds || []).includes(p));
    const isGrandParent = grandParentSet.has(mId);
    const isGrandChild = grandChildSet.has(mId);

    if (mId === rootUserId) {
      borderColor = "#6366f1";
      glow = "rgba(99, 102, 241, 0.8)";
    } else if (isDirectSpouse) {
      borderColor = "#ec4899";
      glow = "rgba(236, 72, 153, 0.7)";
    } else if (isDirectParent) {
      borderColor = "#38bdf8";
      glow = "rgba(56, 189, 248, 0.7)";
    } else if (isGrandParent) {
      borderColor = "#06b6d4";
      glow = "rgba(6, 182, 212, 0.7)";
    } else if (isDirectStepParent) {
      borderColor = "#0284c7";
      glow = "rgba(2, 132, 199, 0.7)";
    } else if (isDirectChild) {
      borderColor = "#10b981";
      glow = "rgba(16, 185, 129, 0.7)";
    } else if (isGrandChild) {
      borderColor = "#14b8a6";
      glow = "rgba(20, 184, 166, 0.7)";
    } else if (isSibling) {
      borderColor = "#a855f7";
      glow = "rgba(168, 85, 247, 0.7)";
    }

    await drawAvatarNode(u, pos.x, pos.y, borderColor, glow);
  }

  const legendItems = [
    { label: "Spouse", color: "#ec4899" },
    { label: "Parent", color: "#38bdf8" },
    { label: "Grandparent", color: "#06b6d4" },
    { label: "Sibling", color: "#a855f7" },
    { label: "Child", color: "#10b981" },
    { label: "Grandchild", color: "#14b8a6" },
    { label: "In-Law", color: "#e879f9" },
  ];

  const legendY = canvasHeight - 45;
  const itemW = 145;
  const legendTotalW = legendItems.length * itemW;
  let legendCurX = (canvasWidth - legendTotalW) / 2;

  ctx.save();
  ctx.font = "600 18px sans-serif";
  for (const item of legendItems) {
    ctx.beginPath();
    ctx.arc(legendCurX + 10, legendY, 7, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
    ctx.fillText(item.label, legendCurX + 26, legendY + 6);
    legendCurX += itemW;
  }
  ctx.restore();

  return canvas.toBuffer("image/png");
}

export async function execute(interaction, client) {
  try {
    const isSlash = interaction.isChatInputCommand?.() || interaction.isCommand?.();
    if (isSlash && interaction.deferReply) {
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
      let u = interaction.guild?.members?.cache?.get(id) || client.users?.cache?.get(id);
      if (!u && interaction.guild) {
        u = await interaction.guild.members.fetch(id).catch(() => null);
      }
      if (!u) {
        u = await client.users.fetch(id).catch(() => null);
      }
      return u;
    };

    const userMap = {};
    await Promise.all(
      memberIds.map(async (id) => {
        const u = await fetchUserSafe(id);
        if (u) {
          userMap[id] = u;
          const avatarUrl = (typeof u.displayAvatarURL === "function")
            ? u.displayAvatarURL({ extension: "png", size: 128 })
            : (u.user ? u.user.displayAvatarURL({ extension: "png", size: 128 }) : null);

          if (avatarUrl) {
            u.cachedAvatarUrl = avatarUrl;
            u.cachedAvatarImg = await loadImage(avatarUrl).catch(() => null);
          }
        }
      }),
    );
    if (interaction.member) {
      userMap[targetUser.id] = interaction.member;
    } else if (!userMap[targetUser.id]) {
      userMap[targetUser.id] = targetUser;
    }

    const canvasBuffer = await renderFullFamilyCanvas(targetUser.id, network, userMap);
    const attachment = new AttachmentBuilder(canvasBuffer, { name: "family-tree.png" });

    const payload = {
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
    logger.error("Error in Tree command execution:", err);
    Sentry.captureException(err);
    const errPayload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 0xed4245,
          components: [{ type: 10, content: "Failed to render family tree. Try again!" }],
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
