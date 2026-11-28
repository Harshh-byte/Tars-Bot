import admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import cron from "node-cron";
import logger from "../utils/logger.js";

const serviceAccount = JSON.parse(
  readFileSync(new URL("../../serviceAccountKey.json", import.meta.url)),
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
db.settings({
  ignoreUndefinedProperties: true,
});

const serversRef = db.collection("servers");
const MAX_MESSAGES = 10;
const DELETE_BATCH_SIZE = 500;
const DATA_RETENTION_MS = 1000 * 60 * 60 * 24 * 30 * 2;
const serverDoc = (serverId) => serversRef.doc(serverId);
const memberDoc = (serverId, userId) =>
  serverDoc(serverId).collection("members").doc(userId);

function validateIds(serverId, userId) {
  if (!serverId) throw new Error("serverId is required.");

  if (userId === undefined || userId === null || userId === "")
    throw new Error("userId is required.");
}

export async function getConversation(serverId, userId) {
  validateIds(serverId, userId);

  const ref = memberDoc(serverId, userId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const newConversation = {
      messages: [],
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(newConversation);
    return newConversation;
  }

  const data = snapshot.data();
  data.messages ??= [];
  return data;
}

export async function saveConversation(serverId, userId, data) {
  validateIds(serverId, userId);

  if (Array.isArray(data.messages)) {
    data.messages = data.messages.slice(-MAX_MESSAGES);
  }

  await memberDoc(serverId, userId).set(
    {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function incrementUserStat(serverId, userId, statKey) {
  validateIds(serverId, userId);
  const ref = memberDoc(serverId, userId);
  const cleanKey = statKey.replace(/^stats\./, "");
  try {
    await ref.set(
      {
        stats: {
          [cleanKey]: FieldValue.increment(1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snapshot = await ref.get();
    const data = snapshot.data();
    return data?.stats?.[cleanKey] ?? 1;
  } catch (err) {
    if (!global.memoryStatsCache) global.memoryStatsCache = new Map();
    const key = `${serverId}_${userId}_${cleanKey}`;
    const current = (global.memoryStatsCache.get(key) || 0) + 1;
    global.memoryStatsCache.set(key, current);
    return current;
  }
}

export async function getServerSettings(serverId) {
  if (!serverId) throw new Error("serverId is required.");
  const snapshot = await serverDoc(serverId).get();
  if (!snapshot.exists) return {};
  return snapshot.data().settings || {};
}

export async function updateServerSettings(serverId, key, value) {
  if (!serverId) throw new Error("serverId is required.");
  await serverDoc(serverId).set(
    {
      [`${key}`]: value,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteUserData(serverId, userId) {
  validateIds(serverId, userId);
  await memberDoc(serverId, userId).delete();
}

export async function deleteServerData(serverId) {
  if (!serverId) throw new Error("serverId is required.");
  await db.recursiveDelete(serverDoc(serverId));
}

export async function addFlagScore(
  serverId,
  userId,
  sessionScore,
  sessionWins = 1,
) {
  validateIds(serverId, userId);
  const ref = memberDoc(serverId, userId);
  try {
    const snapshot = await ref.get();
    const stats = snapshot.data()?.stats || {};
    const existingHighScore = stats.flag_points || 0;
    const existingWins = stats.flag_wins || 0;

    const isNewHighScore = sessionScore > existingHighScore;
    const newHighScore = isNewHighScore ? sessionScore : existingHighScore;
    const newWins = isNewHighScore ? sessionWins : existingWins;

    await ref.set(
      {
        stats: {
          flag_points: newHighScore,
          flag_wins: newWins,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      highScore: newHighScore,
      isNewHighScore,
      highWins: newWins,
    };
  } catch (err) {
    if (!global.memoryFlagScores) global.memoryFlagScores = new Map();
    const key = `${serverId}_${userId}`;
    const current = global.memoryFlagScores.get(key) || { points: 0, wins: 0 };
    const isNewHighScore = sessionScore > current.points;
    if (isNewHighScore) {
      current.points = sessionScore;
      current.wins = sessionWins;
    }
    global.memoryFlagScores.set(key, current);
    return {
      highScore: current.points,
      isNewHighScore,
      highWins: current.wins,
    };
  }
}

export async function getTopFlagPlayers(serverId, limitCount = 10) {
  if (!serverId) return [];
  try {
    const snapshot = await serverDoc(serverId)
      .collection("members")
      .orderBy("stats.flag_points", "desc")
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => ({
      userId: doc.id,
      points: doc.data()?.stats?.flag_points || 0,
      wins: doc.data()?.stats?.flag_wins || 0,
    }));
  } catch (err) {
    logger.warn(`Failed to fetch flag leaderboard: ${err.message}`);
    return [];
  }
}

export async function addPokemonScore(
  serverId,
  userId,
  sessionScore,
  sessionWins = 1,
) {
  validateIds(serverId, userId);
  const ref = memberDoc(serverId, userId);
  try {
    const snapshot = await ref.get();
    const stats = snapshot.data()?.stats || {};
    const existingHighScore = stats.pokemon_points || 0;
    const existingWins = stats.pokemon_wins || 0;

    const isNewHighScore = sessionScore > existingHighScore;
    const newHighScore = isNewHighScore ? sessionScore : existingHighScore;
    const newWins = isNewHighScore ? sessionWins : existingWins;

    await ref.set(
      {
        stats: {
          pokemon_points: newHighScore,
          pokemon_wins: newWins,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      highScore: newHighScore,
      isNewHighScore,
      highWins: newWins,
    };
  } catch (err) {
    if (!global.memoryPokemonScores) global.memoryPokemonScores = new Map();
    const key = `${serverId}_${userId}`;
    const current = global.memoryPokemonScores.get(key) || {
      points: 0,
      wins: 0,
    };
    const isNewHighScore = sessionScore > current.points;
    if (isNewHighScore) {
      current.points = sessionScore;
      current.wins = sessionWins;
    }
    global.memoryPokemonScores.set(key, current);
    return {
      highScore: current.points,
      isNewHighScore,
      highWins: current.wins,
    };
  }
}

export async function getTopPokemonPlayers(serverId, limitCount = 10) {
  if (!serverId) return [];
  try {
    const snapshot = await serverDoc(serverId)
      .collection("members")
      .orderBy("stats.pokemon_points", "desc")
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => ({
      userId: doc.id,
      points: doc.data()?.stats?.pokemon_points || 0,
      wins: doc.data()?.stats?.pokemon_wins || 0,
    }));
  } catch (err) {
    logger.warn(`Failed to fetch pokemon leaderboard: ${err.message}`);
    return [];
  }
}

export async function addScrambleScore(
  serverId,
  userId,
  sessionScore,
  sessionWins = 1,
) {
  validateIds(serverId, userId);
  const ref = memberDoc(serverId, userId);
  try {
    const snapshot = await ref.get();
    const stats = snapshot.data()?.stats || {};
    const existingHighScore = stats.scramble_points || 0;
    const existingWins = stats.scramble_wins || 0;

    const isNewHighScore = sessionScore > existingHighScore;
    const newHighScore = isNewHighScore ? sessionScore : existingHighScore;
    const newWins = isNewHighScore ? sessionWins : existingWins;

    await ref.set(
      {
        stats: {
          scramble_points: newHighScore,
          scramble_wins: newWins,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      highScore: newHighScore,
      isNewHighScore,
      highWins: newWins,
    };
  } catch (err) {
    if (!global.memoryScrambleScores) global.memoryScrambleScores = new Map();
    const key = `${serverId}_${userId}`;
    const current = global.memoryScrambleScores.get(key) || {
      points: 0,
      wins: 0,
    };
    const isNewHighScore = sessionScore > current.points;
    if (isNewHighScore) {
      current.points = sessionScore;
      current.wins = sessionWins;
    }
    global.memoryScrambleScores.set(key, current);
    return {
      highScore: current.points,
      isNewHighScore,
      highWins: current.wins,
    };
  }
}

export async function getTopScramblePlayers(serverId, limitCount = 10) {
  if (!serverId) return [];
  try {
    const snapshot = await serverDoc(serverId)
      .collection("members")
      .orderBy("stats.scramble_points", "desc")
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => ({
      userId: doc.id,
      points: doc.data()?.stats?.scramble_points || 0,
      wins: doc.data()?.stats?.scramble_wins || 0,
    }));
  } catch (err) {
    logger.warn(`Failed to fetch scramble leaderboard: ${err.message}`);
    return [];
  }
}

export async function resetLeaderboards(serverId, category = "all") {
  if (!serverId) return;
  try {
    const membersSnapshot = await serverDoc(serverId)
      .collection("members")
      .get();

    if (!membersSnapshot.empty) {
      const batch = db.batch();
      membersSnapshot.docs.forEach((doc) => {
        const docData = doc.data();
        const updates = {};

        Object.keys(docData).forEach((key) => {
          if (key.startsWith("stats.")) {
            updates[key] = FieldValue.delete();
          }
        });

        const statsUpdate = {};
        if (category === "flag" || category === "all") {
          statsUpdate.flag_points = FieldValue.delete();
          statsUpdate.flag_wins = FieldValue.delete();
        }
        if (category === "pokemon" || category === "all") {
          statsUpdate.pokemon_points = FieldValue.delete();
          statsUpdate.pokemon_wins = FieldValue.delete();
        }
        if (
          category === "scramble" ||
          category === "word" ||
          category === "all"
        ) {
          statsUpdate.scramble_points = FieldValue.delete();
          statsUpdate.scramble_wins = FieldValue.delete();
        }

        updates.stats = statsUpdate;
        batch.set(doc.ref, updates, { merge: true });
      });
      await batch.commit();
    }

    const clearMemoryMap = (map) => {
      if (!map) return;
      const prefix = `${serverId}_`;
      for (const key of Array.from(map.keys())) {
        if (key.startsWith(prefix)) {
          map.delete(key);
        }
      }
    };

    if (category === "flag" || category === "all") {
      clearMemoryMap(global.memoryFlagScores);
    }
    if (category === "pokemon" || category === "all") {
      clearMemoryMap(global.memoryPokemonScores);
    }
    if (category === "scramble" || category === "word" || category === "all") {
      clearMemoryMap(global.memoryScrambleScores);
    }
  } catch (err) {
    logger.error(`Failed to reset leaderboards for ${serverId}:`, err);
  }
}

export async function getUserProfile(serverId, userId) {
  if (!serverId || !userId || serverId === "DM") return null;
  try {
    const memberSnapshot = await memberDoc(serverId, userId).get();
    if (memberSnapshot.exists) {
      return memberSnapshot.data();
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function setUserGender(serverId, userId, gender) {
  if (!serverId || !userId || !gender || serverId === "DM") return;
  try {
    await memberDoc(serverId, userId).set(
      {
        stats: {
          gender: gender,
        },
        gender: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    logger.error("Error fetching user gender:", err);
  }
}

export async function saveAutoMemeConfig(serverId, config) {
  if (!serverId) return;
  try {
    await serverDoc(serverId).set(
      {
        autoMeme: {
          ...config,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
  } catch (err) {
    logger.error(`Failed to save autoMeme config for ${serverId}:`, err);
  }
}

export async function getAutoMemeConfigs() {
  try {
    const snapshot = await serversRef.get();
    if (snapshot.empty) return [];
    const results = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data?.autoMeme && data.autoMeme.enabled) {
        results.push({
          serverId: doc.id,
          ...data.autoMeme,
        });
      }
    });
    return results;
  } catch (err) {
    logger.error(`Failed to get autoMeme configs:`, err);
    return [];
  }
}

export async function getAutoMemeConfig(serverId) {
  if (!serverId) return null;
  try {
    const doc = await serverDoc(serverId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return data?.autoMeme || null;
  } catch (err) {
    logger.error(`Failed to get autoMeme config for ${serverId}:`, err);
    return null;
  }
}

export async function deleteAutoMemeConfig(serverId) {
  if (!serverId) return;
  try {
    await serverDoc(serverId).set(
      {
        autoMeme: {
          enabled: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
  } catch (err) {
    logger.error(`Failed to delete autoMeme config for ${serverId}:`, err);
  }
}

export async function getUserFamily(serverId, userId) {
  if (!serverId || !userId || serverId === "DM") {
    return { partnerId: null, marriedAt: null, parentIds: [], stepParentIds: [], childrenIds: [] };
  }
  try {
    const doc = await serverDoc(serverId).collection("families").doc(userId).get();
    if (doc.exists) {
      const data = doc.data();
      return {
        partnerId: data.partnerId || null,
        marriedAt: data.marriedAt || null,
        parentIds: Array.isArray(data.parentIds) ? data.parentIds : [],
        stepParentIds: Array.isArray(data.stepParentIds) ? data.stepParentIds : [],
        childrenIds: Array.isArray(data.childrenIds) ? data.childrenIds : [],
      };
    }
  } catch (err) {
    logger.error(`Failed to fetch user family for ${userId} in ${serverId}:`, err);
  }
  return { partnerId: null, marriedAt: null, parentIds: [], stepParentIds: [], childrenIds: [] };
}

export async function marryUsers(serverId, user1Id, user2Id) {
  if (!serverId || !user1Id || !user2Id) return false;
  try {
    const now = Math.floor(Date.now() / 1000);
    const batch = db.batch();
    const fam1Ref = serverDoc(serverId).collection("families").doc(user1Id);
    const fam2Ref = serverDoc(serverId).collection("families").doc(user2Id);

    const fam1 = await getUserFamily(serverId, user1Id);
    const fam2 = await getUserFamily(serverId, user2Id);

    let fam1Children = [...fam1.childrenIds];
    let fam2Children = [...fam2.childrenIds];

    for (const cId of fam1.childrenIds) {
      if (!fam2Children.includes(cId)) {
        const childFam = await getUserFamily(serverId, cId);
        const allParentCount = childFam.parentIds.length + (childFam.stepParentIds || []).length;
        if (allParentCount < 2) {
          fam2Children.push(cId);
          const childRef = serverDoc(serverId).collection("families").doc(cId);
          const updatedStepParents = Array.from(new Set([...(childFam.stepParentIds || []), user2Id]));
          batch.set(childRef, { stepParentIds: updatedStepParents, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }
    }

    for (const cId of fam2.childrenIds) {
      if (!fam1Children.includes(cId)) {
        const childFam = await getUserFamily(serverId, cId);
        const allParentCount = childFam.parentIds.length + (childFam.stepParentIds || []).length;
        if (allParentCount < 2) {
          fam1Children.push(cId);
          const childRef = serverDoc(serverId).collection("families").doc(cId);
          const updatedStepParents = Array.from(new Set([...(childFam.stepParentIds || []), user1Id]));
          batch.set(childRef, { stepParentIds: updatedStepParents, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }
    }

    batch.set(fam1Ref, { partnerId: user2Id, marriedAt: now, childrenIds: Array.from(new Set(fam1Children)), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(fam2Ref, { partnerId: user1Id, marriedAt: now, childrenIds: Array.from(new Set(fam2Children)), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();
    return true;
  } catch (err) {
    logger.error(`Failed to marry users ${user1Id} and ${user2Id} in ${serverId}:`, err);
    return false;
  }
}

export async function divorceUsers(serverId, user1Id) {
  if (!serverId || !user1Id) return null;
  try {
    const fam1 = await getUserFamily(serverId, user1Id);
    if (!fam1.partnerId) return null;
    const partnerId = fam1.partnerId;

    const batch = db.batch();
    const fam1Ref = serverDoc(serverId).collection("families").doc(user1Id);
    const fam2Ref = serverDoc(serverId).collection("families").doc(partnerId);

    batch.set(fam1Ref, { partnerId: null, marriedAt: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(fam2Ref, { partnerId: null, marriedAt: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();
    return partnerId;
  } catch (err) {
    logger.error(`Failed to divorce user ${user1Id} in ${serverId}:`, err);
    return null;
  }
}

export async function adoptChild(serverId, parentId, childId) {
  if (!serverId || !parentId || !childId) return false;
  try {
    const batch = db.batch();
    const parentRef = serverDoc(serverId).collection("families").doc(parentId);
    const childRef = serverDoc(serverId).collection("families").doc(childId);

    const parentFam = await getUserFamily(serverId, parentId);
    const childFam = await getUserFamily(serverId, childId);

    const newChildren = Array.from(new Set([...parentFam.childrenIds, childId]));
    const newParents = Array.from(new Set([...childFam.parentIds, parentId]));

    batch.set(parentRef, { childrenIds: newChildren, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(childRef, { parentIds: newParents, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    if (parentFam.partnerId) {
      const spouseRef = serverDoc(serverId).collection("families").doc(parentFam.partnerId);
      const spouseFam = await getUserFamily(serverId, parentFam.partnerId);
      const spouseChildren = Array.from(new Set([...spouseFam.childrenIds, childId]));
      newParents.push(parentFam.partnerId);
      batch.set(spouseRef, { childrenIds: spouseChildren, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(childRef, { parentIds: Array.from(new Set(newParents)) }, { merge: true });
    }

    await batch.commit();
    return true;
  } catch (err) {
    logger.error(`Failed to adopt ${childId} by ${parentId} in ${serverId}:`, err);
    return false;
  }
}

export async function disownChild(serverId, parentId, childId) {
  if (!serverId || !parentId || !childId) return false;
  try {
    const batch = db.batch();
    const parentRef = serverDoc(serverId).collection("families").doc(parentId);
    const childRef = serverDoc(serverId).collection("families").doc(childId);

    const parentFam = await getUserFamily(serverId, parentId);
    const childFam = await getUserFamily(serverId, childId);

    const updatedChildren = parentFam.childrenIds.filter((id) => id !== childId);
    const updatedParents = childFam.parentIds.filter((id) => id !== parentId);
    const updatedStepParents = (childFam.stepParentIds || []).filter((id) => id !== parentId);

    batch.set(parentRef, { childrenIds: updatedChildren, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(childRef, { parentIds: updatedParents, stepParentIds: updatedStepParents, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await batch.commit();
    return true;
  } catch (err) {
    logger.error(`Failed to disown ${childId} by ${parentId} in ${serverId}:`, err);
    return false;
  }
}

export async function getAllSiblings(serverId, userId) {
  if (!serverId || !userId) return [];
  try {
    const fam = await getUserFamily(serverId, userId);
    const allParentIds = Array.from(new Set([...(fam.parentIds || []), ...(fam.stepParentIds || [])]));
    if (allParentIds.length === 0) return [];

    const siblingsSet = new Set();
    for (const pId of allParentIds) {
      const parentFam = await getUserFamily(serverId, pId);
      for (const cId of parentFam.childrenIds) {
        if (cId !== userId) {
          siblingsSet.add(cId);
        }
      }
    }
    return Array.from(siblingsSet);
  } catch (err) {
    return [];
  }
}

export async function getFullFamilyNetwork(serverId, startUserId) {
  if (!serverId || !startUserId) return { members: {}, relationships: [] };

  const members = {};
  const queue = [startUserId];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const fam = await getUserFamily(serverId, currentId);
    members[currentId] = fam;

    const neighbors = [];
    if (fam.partnerId) neighbors.push(fam.partnerId);
    if (Array.isArray(fam.parentIds)) neighbors.push(...fam.parentIds);
    if (Array.isArray(fam.stepParentIds)) neighbors.push(...fam.stepParentIds);
    if (Array.isArray(fam.childrenIds)) neighbors.push(...fam.childrenIds);

    for (const nId of neighbors) {
      if (!visited.has(nId)) {
        queue.push(nId);
      }
    }
  }

  return members;
}

export async function removeUserFromFamily(serverId, userId) {
  if (!serverId || !userId) return;

  const famRef = db.collection("servers").doc(serverId).collection("families").doc(userId);
  const famDoc = await famRef.get();
  if (!famDoc.exists) return;

  const famData = famDoc.data() || {};
  const batch = db.batch();

  // 1. If married, remove spouse link on partner
  if (famData.partnerId) {
    const partnerRef = db.collection("servers").doc(serverId).collection("families").doc(famData.partnerId);
    batch.update(partnerRef, {
      partnerId: null,
      marriedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 2. If child of parents, remove user from parents' childrenIds
  if (Array.isArray(famData.parentIds)) {
    for (const pId of famData.parentIds) {
      const parentRef = db.collection("servers").doc(serverId).collection("families").doc(pId);
      batch.update(parentRef, {
        childrenIds: FieldValue.arrayRemove(userId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 3. If parent of children, remove user from children's parentIds
  if (Array.isArray(famData.childrenIds)) {
    for (const cId of famData.childrenIds) {
      const childRef = db.collection("servers").doc(serverId).collection("families").doc(cId);
      batch.update(childRef, {
        parentIds: FieldValue.arrayRemove(userId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 4. Delete user's family document
  batch.delete(famRef);

  await batch.commit();
}

cron.schedule("0 0 * * *", async () => {
  try {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - DATA_RETENTION_MS));
    const snapshot = await db
      .collectionGroup("members")
      .where("updatedAt", "<=", cutoff)
      .get();

    if (snapshot.empty) return;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += DELETE_BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + DELETE_BATCH_SIZE);
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (error) {
    logger.error("Error in data retention cron job:", error);
  }
});
