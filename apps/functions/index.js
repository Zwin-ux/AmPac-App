const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.serveWebsite = functions.https.onRequest(async (req, res) => {
    const businessId = req.query.id;

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
        const html = data.htmlContent || "<h1>No content</h1>";

        res.set("Content-Type", "text/html");
        res.status(200).send(html);
    } catch (error) {
        console.error("Error fetching website:", error);
        res.status(500).send("Internal Server Error");
    }
});
