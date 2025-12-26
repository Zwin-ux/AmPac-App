import * as admin from "firebase-admin";
// import * as functions from "firebase-functions/v1";

// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

// const db = admin.firestore();

// TODO: Enable this function once Firebase Auth is enabled in the Firebase Console.
// export const onUserCreate = functions.auth.user().onCreate(async (user) => {
//     const { uid, email, displayName, photoURL } = user;
//
//     try {
//         const userRef = db.collection("users").doc(uid);
//         const snapshot = await userRef.get();
//
//         if (!snapshot.exists) {
//             await userRef.set({
//                 uid,
//                 email,
//                 displayName: displayName || "",
//                 photoURL: photoURL || "",
//                 role: "user", // Default role
//                 createdAt: admin.firestore.FieldValue.serverTimestamp(),
//                 settings: {
//                     notifications: true,
//                     theme: "system",
//                 },
//                 onboardingCompleted: false,
//             });
//             console.log(`Created user document for ${uid}`);
//         }
//     } catch (error) {
//         console.error(`Error creating user document for ${uid}:`, error);
//     }
// });
