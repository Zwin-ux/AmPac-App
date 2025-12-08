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
from app.services.token_storage import TokenStorage
from azure.identity import ClientSecretCredential, OnBehalfOfCredential
# Note: OnBehalfOfCredential is for middle-tier. For refresh token flow we might need to manually refresh or use a different cred.
# Ideally we use AuthorizationCodeCredential with the refresh token, but Azure Identity's implementation expects a client_secret too.
import time

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
            
        self.token_storage = TokenStorage()

    async def get_user_client(self, user_id: str) -> Optional[GraphServiceClient]:
        """
        Returns a GraphServiceClient authenticated as the specific user.
        """
        tokens = await self.token_storage.get_tokens(user_id)
        if not tokens or not tokens.get("refresh_token"):
            return None

        # We need to construct a credential that can use the refresh token.
        # Azure Identity doesn't have a simple "RefreshTokenCredential".
        # We can use a custom TokenCredential or manually refresh.
        # For simplicity in this integration, we'll use a helper to refresh the token 
        # using the client credentials + refresh token flow, then use a BearerTokenCredential.
        
        # However, a robust way is to use the OnBehalfOfCredential if we had an incoming assertion,
        # but here we are acting offline.
        
        # Let's implement a simple refresh mechanism here or use a library helper if available.
        # For now, we will assume we can get a fresh access token.
        
        access_token = await self._refresh_user_token(tokens.get("refresh_token"))
        if not access_token:
            return None
            
        # Create a client with a simple AccessTokenCredential
        from azure.core.credentials import AccessToken
        
        class StaticTokenCredential:
            def __init__(self, token):
                self.token = token
            async def get_token(self, *scopes, **kwargs):
                # Return the token with a far future expiry so it's used immediately
                return AccessToken(self.token, int(time.time() + 3600))

        return GraphServiceClient(credentials=StaticTokenCredential(access_token), scopes=["User.Read"])

    async def _refresh_user_token(self, refresh_token: str) -> Optional[str]:
        """
        Exchanges a refresh token for a new access token using the confidential client flow.
        """
        import httpx
        
        if not self.client_id or not self.client_secret or not self.tenant_id:
            return None

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "scope": "User.Read Mail.ReadWrite Calendars.ReadWrite Files.ReadWrite.All offline_access"
            })
            
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                print(f"Failed to refresh token: {response.text}")
                return None

    async def get_staff_availability(self, staff_email: str, start_date: datetime, end_date: datetime):
        """
        Finds free meeting slots on the staff member's calendar.
        """
        if not self.client:
            return []

        try:
            request_body = GetSchedulePostRequestBody(
                schedules=[staff_email],
                start_time=DateTimeTimeZone(
                    date_time=start_date.isoformat(),
                    time_zone="UTC"
                ),
                end_time=DateTimeTimeZone(
                    date_time=end_date.isoformat(),
                    time_zone="UTC"
                ),
                availability_view_interval=30
            )
            
            result = await self.client.users.by_user_id(staff_email).calendar.get_schedule.post(request_body)
            return result.value
        except Exception as e:
            print(f"Error fetching availability for {staff_email}: {e}")
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
                subject=subject,
                participants={
                    "attendees": [
                        {
                            "upn": email,
                            "role": "attendee"
                        } for email in attendees
                    ]
                }
            )
            
            result = await self.client.me.online_meetings.post(request_body)
            return result.join_web_url
        except Exception as e:
            print(f"Error creating meeting: {e}")
            return "https://teams.microsoft.com/l/meetup-join/mock-link-fallback"

    async def create_chat(self, staff_email: str, borrower_email: str) -> str:
        """
        Creates a one-on-one chat between a staff member and a borrower.
        """
        if not self.client:
            return "mock_chat_id_fallback"

        try:
            request_body = {
                "chatType": "oneOnOne",
                "members": [
                    {
                        "@odata.type": "#microsoft.graph.aadUserConversationMember",
                        "roles": ["owner"],
                        "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{staff_email}')"
                    },
                    {
                        "@odata.type": "#microsoft.graph.aadUserConversationMember",
                        "roles": ["owner"],
                        "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{borrower_email}')"
                    }
                ]
            }
            result = await self.client.chats.post(request_body)
            return result.id
        except Exception as e:
            print(f"Error creating chat: {e}")
            return "mock_chat_id_fallback"

    async def send_chat_message(self, chat_id: str, message: str):
        """
        Sends a message to a Teams chat.
        """
        if not self.client:
            return

        try:
            from msgraph.generated.chats.item.messages.messages_request_builder import MessagesRequestBuilder
            
            request_body = {
                "body": {
                    "content": message
                }
            }
            await self.client.chats.by_chat_id(chat_id).messages.post(request_body)
        except Exception as e:
            print(f"Error sending chat message: {e}")
    async def create_deal_channel(self, team_id: str, deal_name: str, description: str) -> str:
        """
        Creates a new channel for a deal in a specific Team.
        """
        if not self.client:
            return "mock_channel_id"

        try:
            from msgraph.generated.models.channel import Channel
            
            request_body = Channel(
                display_name=deal_name,
                description=description,
                membership_type="standard"
            )
            
            result = await self.client.teams.by_team_id(team_id).channels.post(request_body)
            return result.id
        except Exception as e:
            print(f"Error creating channel: {e}")
            return "mock_channel_id_fallback"

    async def post_adaptive_card(self, team_id: str, channel_id: str, card_content: dict):
        """
        Posts an Adaptive Card to a Teams channel.
        """
        if not self.client:
            return

        try:
            from msgraph.generated.teams.item.channels.item.messages.messages_request_builder import MessagesRequestBuilder
            from msgraph.generated.models.chat_message import ChatMessage
            from msgraph.generated.models.item_body import ItemBody
            from msgraph.generated.models.chat_message_attachment import ChatMessageAttachment
            import json

            request_body = ChatMessage(
                subject=None,
                body=ItemBody(
                    content_type="html",
                    content="<attachment id=\"74d20c7f34aa4a7fb74e2b30004247c5\"></attachment>"
                ),
                attachments=[
                    ChatMessageAttachment(
                        id="74d20c7f34aa4a7fb74e2b30004247c5",
                        content_type="application/vnd.microsoft.card.adaptive",
                        content=json.dumps(card_content)
                    )
                ]
            )
            
            await self.client.teams.by_team_id(team_id).channels.by_channel_id(channel_id).messages.post(request_body)
        except Exception as e:
            print(f"Error posting adaptive card: {e}")
    async def create_calendar_event(self, organizer_email: str, subject: str, start_time: str, end_time: str, attendees: List[str]) -> Optional[dict]:
        """
        Creates a calendar event on the organizer's calendar.
        """
        if not self.client:
            return {
                "eventId": "mock-event-id-" + str(int(time.time())),
                "joinUrl": "https://teams.microsoft.com/l/meetup-join/mock-link"
            }

        try:
            from msgraph.generated.models.event import Event
            from msgraph.generated.models.item_body import ItemBody
            from msgraph.generated.models.body_type import BodyType
            from msgraph.generated.models.date_time_time_zone import DateTimeTimeZone
            from msgraph.generated.models.attendee import Attendee
            from msgraph.generated.models.email_address import EmailAddress
            from msgraph.generated.models.attendee_type import AttendeeType

            request_body = Event(
                subject=subject,
                start=DateTimeTimeZone(
                    date_time=start_time,
                    time_zone="UTC"
                ),
                end=DateTimeTimeZone(
                    date_time=end_time,
                    time_zone="UTC"
                ),
                attendees=[
                    Attendee(
                        email_address=EmailAddress(
                            address=email,
                            name=email # Optional: could pass name if available
                        ),
                        type=AttendeeType.Required
                    ) for email in attendees
                ],
                is_online_meeting=True,
                online_meeting_provider="teamsForBusiness"
            )

            result = await self.client.users.by_user_id(organizer_email).calendar.events.post(request_body)
            
            return {
                "eventId": result.id,
                "joinUrl": result.online_meeting.join_url if result.online_meeting else None
            }
        except Exception as e:
            print(f"Error creating calendar event: {e}")
            return None

    async def get_recent_emails(self, user_id: str, limit: int = 5) -> List[dict]:
        """
        Fetches recent emails for the user.
        """
        client = await self.get_user_client(user_id)
        if not client:
            return []

        try:
            # Select specific fields to reduce payload
            query_params = {
                "$top": limit,
                "$select": "id,subject,sender,receivedDateTime,webLink,bodyPreview",
                "$orderby": "receivedDateTime desc"
            }
            
            # Note: The Python SDK might handle query params differently.
            # Using the fluent API pattern:
            result = await client.me.messages.get(request_configuration=lambda q: q.query_parameters.update(query_params))
            
            emails = []
            if result and result.value:
                for msg in result.value:
                    emails.append({
                        "id": msg.id,
                        "subject": msg.subject,
                        "sender": {
                            "emailAddress": {
                                "name": msg.sender.email_address.name if msg.sender and msg.sender.email_address else "Unknown",
                                "address": msg.sender.email_address.address if msg.sender and msg.sender.email_address else ""
                            }
                        },
                        "receivedDateTime": msg.received_date_time.isoformat() if msg.received_date_time else None,
                        "webLink": msg.web_link,
                        "bodyPreview": msg.body_preview
                    })
            return emails
        except Exception as e:
            print(f"Error fetching emails for {user_id}: {e}")
            return []

    async def get_upcoming_events(self, user_id: str, limit: int = 3) -> List[dict]:
        """
        Fetches upcoming calendar events for the user.
        """
        client = await self.get_user_client(user_id)
        if not client:
            return []

        try:
            start_time = datetime.utcnow().isoformat()
            end_time = (datetime.utcnow() + timedelta(days=7)).isoformat()
            
            # For calendar view, we need start and end times
            query_params = {
                "$top": limit,
                "$select": "id,subject,start,end,webLink,location",
                "$orderby": "start/dateTime"
            }
            
            # Using calendar view to expand recurring events
            result = await client.me.calendar_view.get(
                request_configuration=lambda q: q.query_parameters.update({
                    "start_date_time": start_time,
                    "end_date_time": end_time,
                    **query_params
                })
            )
            
            events = []
            if result and result.value:
                for evt in result.value:
                    events.append({
                        "id": evt.id,
                        "subject": evt.subject,
                        "start": {
                            "dateTime": evt.start.date_time,
                            "timeZone": evt.start.time_zone
                        },
                        "end": {
                            "dateTime": evt.end.date_time,
                            "timeZone": evt.end.time_zone
                        },
                        "webLink": evt.web_link,
                        "location": evt.location.display_name if evt.location else ""
                    })
            return events
        except Exception as e:
            print(f"Error fetching events for {user_id}: {e}")
            return []

graph_service = GraphService()
