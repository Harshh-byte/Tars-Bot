import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync(new URL("../serviceAccountKey.json", import.meta.url))
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function cleanupActionStats() {
  console.log("Starting cleanup of action stats from Firestore...");
  
  const snapshot = await db.collectionGroup("members").get();
  console.log(`Found ${snapshot.docs.length} member documents.`);

  let updatedCount = 0;
  const batchSize = 400;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const stats = data?.stats;

    if (stats && (stats.hugCount !== undefined || stats.kissCount !== undefined || stats.slapCount !== undefined || stats.punchCount !== undefined || stats.patCount !== undefined)) {
      const updates = {};
      if (stats.hugCount !== undefined) updates["stats.hugCount"] = FieldValue.delete();
      if (stats.kissCount !== undefined) updates["stats.kissCount"] = FieldValue.delete();
      if (stats.slapCount !== undefined) updates["stats.slapCount"] = FieldValue.delete();
      if (stats.punchCount !== undefined) updates["stats.punchCount"] = FieldValue.delete();
      if (stats.patCount !== undefined) updates["stats.patCount"] = FieldValue.delete();

      batch.update(doc.ref, updates);
      opsInBatch++;
      updatedCount++;

      if (opsInBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${opsInBatch} updates.`);
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${opsInBatch} updates.`);
  }

  console.log(`Cleanup complete! Cleaned stats in ${updatedCount} member documents.`);
  process.exit(0);
}

cleanupActionStats().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
