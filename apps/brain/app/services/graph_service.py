from app.core.config import get_settings
from datetime import datetime, timedelta
from typing import List, Optional
from azure.identity import ClientSecretCredential
from msgraph import GraphServiceClient
from msgraph.generated.users.item.calendar.get_schedule.get_schedule_post_request_body import GetSchedulePostRequestBody
from msgraph.generated.models.date_time_time_zone import DateTimeTimeZone
from msgraph.generated.models.attendee_base import AttendeeBase
from msgraph.generated.models.email_address import EmailAddress
from msgraph.generated.models.online_meeting import OnlineMeeting

settings = get_settings()

class GraphService:
    """
    Service for interacting with Microsoft Graph API (Teams, Outlook).
    """

    def __init__(self):
        self.client_id = settings.AZURE_CLIENT_ID
        self.client_secret = settings.AZURE_CLIENT_SECRET
        self.tenant_id = settings.AZURE_TENANT_ID
        
        if self.client_id and self.client_secret and self.tenant_id:
            self.credential = ClientSecretCredential(
                tenant_id=self.tenant_id,
                client_id=self.client_id,
                client_secret=self.client_secret
            )
            self.client = GraphServiceClient(credentials=self.credential)
        else:
            self.client = None
            print("Microsoft Graph credentials not configured.")

    async def get_staff_availability(self, staff_email: str, start_date: datetime, end_date: datetime):
        """
        Finds free meeting slots on the staff member's calendar.
        """
        if not self.client:
            return []

        # Placeholder for actual Graph SDK call
        # In a real implementation, we would construct the GetSchedulePostRequestBody
        # and call self.client.users.by_user_id(staff_email).calendar.get_schedule.post(...)
        return []

    async def create_online_meeting(self, subject: str, start_time: datetime, end_time: datetime, attendees: List[str]) -> str:
        """
        Creates a Teams meeting and returns the join URL.
        """
        if not self.client:
            return "https://teams.microsoft.com/l/meetup-join/mock-link"

        try:
            request_body = OnlineMeeting(
                start_date_time=start_time.isoformat(),
                end_date_time=end_time.isoformat(),
                subject=subject
            )
            # This would be a call to create the meeting
            # result = await self.client.me.online_meetings.post(request_body)
            # return result.join_web_url
            return "https://teams.microsoft.com/l/meetup-join/mock-link"
        except Exception as e:
            print(f"Error creating meeting: {e}")
            return ""

    async def send_chat_message(self, chat_id: str, message: str):
        """
        Sends a message to a Teams chat.
        """
        if not self.client:
            return

        # await self.client.chats.by_chat_id(chat_id).messages.post(...)
        pass

    async def create_chat_thread(self, staff_email: str, borrower_email: str) -> str:
        """
        Creates a new 1:1 or group chat thread.
        Returns the Chat ID.
        """
        # Placeholder
        return "mock_chat_id_789"
