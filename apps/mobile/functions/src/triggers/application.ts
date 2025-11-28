import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const onApplicationUpdate = functions.firestore
    .document("applications/{appId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        // Check if status changed to 'submitted'
        if (previousData && newData && previousData.status !== "submitted" && newData.status === "submitted") {
            const appId = context.params.appId;
            console.log(`Application ${appId} submitted!`);

            try {
                // 1. Mark submission timestamp if not present
                await change.after.ref.update({
                    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
                });

                // 2. Notify Admins (Placeholder for email/push notification)
                console.log(`TODO: Send email notification to admins for app ${appId}`);

                // 3. Create an audit log entry
                await db.collection("auditLogs").add({
                    entityId: appId,
                    entityType: "application",
                    action: "submit",
                    userId: newData.userId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    details: {
                        previousStatus: previousData.status,
                        newStatus: newData.status,
                    },
                });

            } catch (error) {
                console.error(`Error processing application submission for ${appId}:`, error);
            }
        }
    });
