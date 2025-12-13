const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.serveWebsite = functions.https.onRequest(async (req, res) => {
    const businessId = req.query.id;
    const slug = req.query.slug;

    if (!businessId && !slug) {
        res.status(400).send("Missing business ID or slug");
        return;
    }

    try {
        let doc;
        const websites = admin.firestore().collection("websites");

        if (businessId) {
            doc = await websites.doc(businessId).get();
        }

        if ((!doc || !doc.exists) && slug) {
            const snap = await websites.where("slug", "==", slug).limit(1).get();
            if (!snap.empty) {
                doc = snap.docs[0];
            }
        }

        if (!doc || !doc.exists) {
            res.status(404).send("Website not found");
            return;
        }

        const data = doc.data();
        const snapshot = data.publishedSnapshot || {};
        const html = snapshot.htmlContent || data.htmlContent || "<h1>No content</h1>";

        res.set("Content-Type", "text/html");
        res.status(200).send(html);
    } catch (error) {
        console.error("Error fetching website:", error);
        res.status(500).send("Internal Server Error");
    }
});
