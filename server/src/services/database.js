import admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import cron from "node-cron";

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
const usersRef = db.collection("users");
const MAX_MESSAGES = 10;
const DELETE_BATCH_SIZE = 500;
const DATA_RETENTION_MS = 1000 * 60 * 60 * 24 * 30 * 6;
const serverDoc = (serverId) => serversRef.doc(serverId);
const memberDoc = (serverId, userId) =>
  serverDoc(serverId).collection("members").doc(userId);
const userDoc = (userId) => usersRef.doc(userId);

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
  try {
    await ref.set(
      {
        stats: {
          [statKey]: FieldValue.increment(1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snapshot = await ref.get();
    const data = snapshot.data();
    return data?.stats?.[statKey] ?? data?.[`stats.${statKey}`] ?? 1;
  } catch (err) {
    if (!global.memoryStatsCache) global.memoryStatsCache = new Map();
    const key = `${serverId}_${userId}_${statKey}`;
    const current = (global.memoryStatsCache.get(key) || 0) + 1;
    global.memoryStatsCache.set(key, current);
    return current;
  }
}

export async function incrementGlobalUserStat(userId, statKey) {
  if (!userId) throw new Error("userId is required.");
  const ref = userDoc(userId);
  try {
    await ref.set(
      {
        userId,
        stats: {
          [statKey]: FieldValue.increment(1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snapshot = await ref.get();
    const data = snapshot.data();
    return data?.stats?.[statKey] ?? data?.[`stats.${statKey}`] ?? 1;
  } catch (err) {
    if (!global.memoryGlobalStatsCache)
      global.memoryGlobalStatsCache = new Map();
    const key = `${userId}_${statKey}`;
    const current = (global.memoryGlobalStatsCache.get(key) || 0) + 1;
    global.memoryGlobalStatsCache.set(key, current);
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
      [`settings.${key}`]: value,
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

export async function addFlagScore(serverId, userId, pointsGained) {
  validateIds(serverId, userId);
  const ref = memberDoc(serverId, userId);
  try {
    await ref.set(
      {
        stats: {
          flag_points: FieldValue.increment(pointsGained),
          flag_wins: FieldValue.increment(1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snapshot = await ref.get();
    const data = snapshot.data()?.stats || {};
    return {
      totalPoints: data.flag_points || pointsGained,
      totalWins: data.flag_wins || 1,
    };
  } catch (err) {
    if (!global.memoryFlagScores) global.memoryFlagScores = new Map();
    const key = `${serverId}_${userId}`;
    const current = global.memoryFlagScores.get(key) || { points: 0, wins: 0 };
    current.points += pointsGained;
    current.wins += 1;
    global.memoryFlagScores.set(key, current);
    return { totalPoints: current.points, totalWins: current.wins };
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

export async function addPokemonScore(serverId, userId, pointsGained) {
  validateIds(serverId, userId);
  const ref = memberDoc(serverId, userId);
  try {
    await ref.set(
      {
        stats: {
          pokemon_points: FieldValue.increment(pointsGained),
          pokemon_wins: FieldValue.increment(1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snapshot = await ref.get();
    const data = snapshot.data()?.stats || {};
    return {
      totalPoints: data.pokemon_points || pointsGained,
      totalWins: data.pokemon_wins || 1,
    };
  } catch (err) {
    if (!global.memoryPokemonScores) global.memoryPokemonScores = new Map();
    const key = `${serverId}_${userId}`;
    const current = global.memoryPokemonScores.get(key) || {
      points: 0,
      wins: 0,
    };
    current.points += pointsGained;
    current.wins += 1;
    global.memoryPokemonScores.set(key, current);
    return { totalPoints: current.points, totalWins: current.wins };
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

export async function getUserProfile(userId) {
  if (!userId) return null;
  try {
    const snapshot = await userDoc(userId).get();
    if (!snapshot.exists) return null;
    return snapshot.data();
  } catch (err) {
    return null;
  }
}

export async function setUserGender(userId, gender) {
  if (!userId || !gender) return;
  try {
    await userDoc(userId).set(
      {
        gender,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {}
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
