# Deployment Options for AmPac Mobile

Currently, you are running a **Development Server** (`npx expo start`). This requires your computer to be on. To make your app available 24/7, you need to **deploy** or **build** it.

Since your backend (Firebase) is already cloud-hosted and running 24/7, you just need to publish the "Frontend" (the app itself).

If you’re deploying to real users via the App Store / Google Play, use `apps/mobile/DEPLOYMENT.md` (full production runbook).

## Option 1: Publish as a Website (Fastest)
You can deploy the web version of your app to a hosting provider. This gives you a URL (e.g., `https://ampac-mobile.vercel.app`) that anyone can access 24/7.

**Recommended Tools:**
- **Vercel** (Easiest for React/Expo)
- **Firebase Hosting** (Good since you already use Firebase)
- **Netlify**

**Steps:**
1. Run `npx expo export -p web` to generate static files.
2. Deploy the `dist` folder to your provider.

## Option 2: Build for App Stores (Native)
To have the app running on phones without a server, you build a standalone binary file (.apk for Android, .ipa for iOS).

**Tool:** **EAS Build** (Expo Application Services)

**Steps:**
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build Android: `eas build -p android --profile preview`
5. Build iOS: `eas build -p ios --profile preview`

## Option 3: EAS Update (Development)
If you just want to keep the app working on your phone without the server running (but still using Expo Go), you can publish an update.

**Command:** `npx expo export && npx expo-cli publish` (Legacy) or `eas update` (Modern).

---

### Recommendation
For a "24/7 running version" to show people immediately, **Option 1 (Web Deployment)** is usually the best first step.
