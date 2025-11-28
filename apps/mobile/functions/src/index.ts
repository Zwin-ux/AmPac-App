import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Initialize Admin SDK once
admin.initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10 });

// Export triggers
export * from "./triggers/user";
export * from "./triggers/application";
