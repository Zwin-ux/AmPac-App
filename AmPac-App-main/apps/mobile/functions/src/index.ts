import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Admin SDK once
admin.initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10 });

// Export triggers
export * from "./triggers/user";
export * from "./triggers/application";

// Website Hosting Function
export const serveWebsite = onRequest(async (req, res) => {
    const businessId = req.query.id as string;

    if (!businessId) {
        res.status(400).send("Missing business ID");
        return;
    }

    try {
        const doc = await admin.firestore().collection("websites").doc(businessId).get();
        
        if (!doc.exists) {
            res.status(404).send("Website not found");
            return;
        }

        const data = doc.data();
        if (!data || !data.htmlContent) {
            res.status(500).send("Website content is missing");
            return;
        }

        // Increment visit count asynchronously
        doc.ref.update({ visitCount: admin.firestore.FieldValue.increment(1) }).catch(console.error);

        res.set("Content-Type", "text/html");
        res.send(data.htmlContent);
    } catch (error) {
        console.error("Error serving website:", error);
        res.status(500).send("Internal Server Error");
    }
});

