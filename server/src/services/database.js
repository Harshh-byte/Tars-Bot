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
