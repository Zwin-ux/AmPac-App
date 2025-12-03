from firebase_admin import messaging
from app.core.firebase import get_db
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        pass

    def send_push_notification(self, user_id: str, title: str, body: str, data: dict = None):
        """
        Sends a push notification to a specific user.
        Requires the user to have an FCM token stored in Firestore under `users/{user_id}/fcmTokens`.
        """
        try:
            db = get_db()
            user_ref = db.collection("users").document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                logger.warning(f"User {user_id} not found for notification.")
                return

            user_data = user_doc.to_dict()
            fcm_token = user_data.get("fcmToken") # Simplified: assumes single token for MVP
            
            if not fcm_token:
                logger.info(f"No FCM token found for user {user_id}. Skipping notification.")
                return

            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=fcm_token,
            )

            response = messaging.send(message)
            logger.info(f"Successfully sent message: {response}")
            return response

        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return None

    def notify_new_message(self, recipient_id: str, sender_name: str, message_preview: str, thread_id: str):
        """
        Convenience method for new chat messages.
        """
        return self.send_push_notification(
            user_id=recipient_id,
            title=f"New message from {sender_name}",
            body=message_preview,
            data={"type": "chat_message", "threadId": thread_id}
        )

notification_service = NotificationService()
