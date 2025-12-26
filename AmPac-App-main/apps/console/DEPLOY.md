# Deploying AmPac Console to Vercel

## Prerequisites
- Vercel CLI installed (`npm i -g vercel`) or use `npx vercel`
- Vercel account

## Steps

1.  **Navigate to the console directory**:
    ```bash
    cd apps/console
    ```

2.  **Run Vercel Deployment**:
    ```bash
    npx vercel
    ```
    - Follow the prompts to link the project to your Vercel account.
    - Use default settings for Vite (Output Directory: `dist`).

3.  **Configure Environment Variables**:
    Go to your Vercel Project Settings > Environment Variables and add the following:

    | Variable | Description |
    |----------|-------------|
    | `VITE_AZURE_CLIENT_ID` | Your Azure AD Client ID |
    | `VITE_AZURE_TENANT_ID` | Your Azure AD Tenant ID |
    | `VITE_FIREBASE_API_KEY` | Firebase API Key |
    | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
    | `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
    | `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
    | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
    | `VITE_FIREBASE_APP_ID` | Firebase App ID |
    | `VITE_FIREBASE_MEASUREMENT_ID` | (Optional) Firebase Measurement ID |

4.  **Production Deployment**:
    Once tested, deploy to production:
    ```bash
    npx vercel --prod
    ```

## Troubleshooting
- If the build fails on Vercel, check the "Build & Development Settings".
    - Framework Preset: `Vite`
    - Build Command: `npm run build`
    - Output Directory: `dist`
