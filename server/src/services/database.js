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
const MAX_MESSAGES = 10;
const DELETE_BATCH_SIZE = 500;
const DATA_RETENTION_MS = 1000 * 60 * 60 * 24 * 30 * 6;
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
      userId,
      messages: [],
      profile: {},
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(newConversation);
    return newConversation;
  }

  const data = snapshot.data();
  data.messages ??= [];
  data.profile ??= {};
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
      userId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateProfile(serverId, userId, key, value) {
  validateIds(serverId, userId);

  await memberDoc(serverId, userId).set(
    {
      [`profile.${key}`]: value,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
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
    throw error;
  }
});
