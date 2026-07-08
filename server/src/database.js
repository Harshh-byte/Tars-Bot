import admin from "firebase-admin";
import { readFileSync } from "fs";
import cron from "node-cron";

const serviceAccount = JSON.parse(
  readFileSync(new URL("../serviceAccountKey.json", import.meta.url)),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://tars-db-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const db = admin.database();
const usersRef = db.ref("users");

export async function getConversation(userId) {
  try {
    const snapshot = await usersRef.child(userId).get();
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (!data.messages) data.messages = [];
      if (!data.profile) data.profile = {};
      return data;
    } else {
      const newUser = { messages: [], profile: {}, updatedAt: Date.now() };
      await usersRef.child(userId).set(newUser);
      return newUser;
    }
  } catch (error) {
    console.error("Firebase Get Error:", error);
    return { messages: [], profile: {} };
  }
}

export async function saveConversation(userId, data) {
  try {
    if (data.messages && Array.isArray(data.messages)) {
      if (data.messages.length > 10) {
        data.messages = data.messages.slice(-10);
      }
    }

    data.updatedAt = Date.now();
    await usersRef.child(userId).update(data);
  } catch (error) {
    console.error("Firebase Save Error:", error);
  }
}

export async function updateProfile(userId, key, value) {
  try {
    await usersRef.child(`${userId}/profile`).update({ [key]: value });
    await usersRef.child(userId).update({ updatedAt: Date.now() });
  } catch (error) {
    console.error("Firebase Profile Update Error:", error);
  }
}

cron.schedule("0 0 * * *", async () => {
  console.log("[CRON] Running database expiration cleanup check...");

  try {
    const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - sixMonthsInMs;

    const expiredUsersQuery = usersRef
      .orderByChild("updatedAt")
      .endAt(cutoffTime);
    const snapshot = await expiredUsersQuery.once("value");

    if (snapshot.exists()) {
      const usersToDelete = {};

      snapshot.forEach((childSnapshot) => {
        usersToDelete[childSnapshot.key] = null;
      });

      await usersRef.update(usersToDelete);
      console.log(
        `[CRON] Cleaned up ${Object.keys(usersToDelete).length} inactive user profiles.`,
      );
    } else {
      console.log("[CRON] No expired user profiles found.");
    }
  } catch (error) {
    console.error("[CRON] Database cleanup operation failed:", error);
  }
});
