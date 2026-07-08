const {setGlobalOptions} = require("firebase-functions");
setGlobalOptions({maxInstances: 10});
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.cleanupExpiredRides = functions.pubsub
    .schedule("every 1 hours")
    .onRun(async (context) => {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      const snapshot = await db.collection("rides")
          .where("expiresAt", "<=", now)
          .where("status", "in", ["open", "full"])
          .get();

      const batch = db.batch();

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {status: "completed"});
      });

      await batch.commit();

      console.log(`Marked ${snapshot.size} rides as completed`);

      return null;
    });
