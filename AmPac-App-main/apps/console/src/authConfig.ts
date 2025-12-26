import type { Configuration, PopupRequest } from "@azure/msal-browser";

// Config object to be passed to Msal on creation
export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "YOUR_CLIENT_ID_HERE",
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
        redirectUri: "/",
        postLogoutRedirectUri: "/"
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    }
};

// Scopes for the Console application
// Base: User.Read (Profile), Calendars.Read (View Calendar)
// Elevated: Mail.Read (View Emails), Calendars.ReadWrite (Schedule Meetings), Mail.Send (Send Emails)
// Enterprise: Files.ReadWrite (SharePoint), Tasks.ReadWrite (Planner), GroupMember.Read.All (RBAC)
export const loginRequest: PopupRequest = {
    scopes: [
        "User.Read",
        "Calendars.ReadWrite",
        "Mail.Read",
        "Mail.Send",
        "People.Read",
        "Files.ReadWrite",
        "Tasks.ReadWrite",
        "GroupMember.Read.All",
        "offline_access"
    ]
};

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages",
    graphCalendarEndpoint: "https://graph.microsoft.com/v1.0/me/calendar/events"
};
