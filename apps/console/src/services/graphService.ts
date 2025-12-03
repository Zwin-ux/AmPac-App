import { InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import type { IPublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "../authConfig";

// Define types for Graph data
export interface GraphUser {
    displayName: string;
    mail: string;
    jobTitle?: string;
    id: string;
}

export interface GraphEmail {
    id: string;
    subject: string;
    bodyPreview: string;
    receivedDateTime: string;
    from: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    isRead: boolean;
    webLink: string;
}

export interface GraphEvent {
    id: string;
    subject: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    webLink: string;
    isOnlineMeeting: boolean;
    onlineMeeting?: {
        joinUrl: string;
    };
}

export class GraphService {
    private msalInstance: PublicClientApplication | IPublicClientApplication;
    private account: any;

    constructor(msalInstance: PublicClientApplication | IPublicClientApplication, account: any) {
        this.msalInstance = msalInstance;
        this.account = account;
    }

    private async getToken(): Promise<string> {
        const request = {
            ...loginRequest,
            account: this.account
        };

        try {
            const response = await this.msalInstance.acquireTokenSilent(request);
            return response.accessToken;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                const response = await this.msalInstance.acquireTokenPopup(request);
                return response.accessToken;
            }
            throw error;
        }
    }

    private async callGraph(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
        const token = await this.getToken();
        const headers = new Headers();
        const bearer = `Bearer ${token}`;

        headers.append("Authorization", bearer);
        headers.append("Content-Type", "application/json");

        const options: RequestInit = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };

        const response = await fetch(endpoint, options);
        if (!response.ok) {
            throw new Error(`Graph API call failed: ${response.statusText}`);
        }
        return await response.json();
    }

    // User Profile
    async getProfile(): Promise<GraphUser> {
        return this.callGraph("https://graph.microsoft.com/v1.0/me");
    }

    // Emails
    async getRecentEmails(top: number = 10): Promise<GraphEmail[]> {
        const response = await this.callGraph(`https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$select=id,subject,bodyPreview,receivedDateTime,from,isRead,webLink&$orderby=receivedDateTime desc`);
        return response.value;
    }

    async sendEmail(to: string, subject: string, content: string): Promise<void> {
        const email = {
            message: {
                subject: subject,
                body: {
                    contentType: "HTML",
                    content: content
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ]
            },
            saveToSentItems: "true"
        };
        await this.callGraph("https://graph.microsoft.com/v1.0/me/sendMail", "POST", email);
    }

    // Calendar
    async getUpcomingEvents(hours: number = 24): Promise<GraphEvent[]> {
        const now = new Date();
        const end = new Date(now.getTime() + hours * 60 * 60 * 1000);

        const startStr = now.toISOString();
        const endStr = end.toISOString();

        const response = await this.callGraph(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$select=id,subject,start,end,webLink,isOnlineMeeting,onlineMeeting&$orderby=start/dateTime`);
        return response.value;
    }

    async createMeeting(subject: string, start: Date, end: Date, attendees: string[]): Promise<GraphEvent> {
        const event = {
            subject: subject,
            start: {
                dateTime: start.toISOString(),
                timeZone: "UTC"
            },
            end: {
                dateTime: end.toISOString(),
                timeZone: "UTC"
            },
            attendees: attendees.map(email => ({
                emailAddress: {
                    address: email,
                    name: email // Optional: could look up name
                },
                type: "required"
            })),
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness"
        };

        return this.callGraph("https://graph.microsoft.com/v1.0/me/events", "POST", event);
    }
}
