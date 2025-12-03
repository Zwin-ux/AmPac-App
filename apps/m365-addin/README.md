# AmPac Console M365 Add-in

This directory contains the manifest and assets for the AmPac Console M365 Add-in, which integrates the console into Microsoft Teams and Outlook.

## Prerequisites

- A Microsoft 365 Tenant (Developer Tenant recommended).
- Admin permissions to sideload apps or "Upload a custom app".

## Sideloading in Teams

1.  Zip the contents of this directory (manifest.json, color.png, outline.png).
    - *Note: You need to add actual image files for color.png (192x192) and outline.png (32x32) before zipping.*
2.  Open Microsoft Teams.
3.  Go to **Apps** > **Manage your apps** > **Upload an app**.
4.  Select **Upload a custom app** > **Upload for me or my org**.
5.  Select the zip file.
6.  Click **Add**.

## Sideloading in Outlook

1.  Go to [Outlook on the web](https://outlook.office.com).
2.  Create a new message.
3.  Click the **...** (More actions) menu at the bottom of the compose window.
4.  Select **Get Add-ins**.
5.  Go to **My add-ins**.
6.  Scroll down to **Custom add-ins**.
7.  Click **Add a custom add-in** > **Add from file...**.
8.  Select the `manifest.json` file (or the zip file if unified).
9.  Click **Install**.

## Configuration

Ensure the `webApplicationInfo` section in `manifest.json` matches your Azure AD App Registration Client ID.
