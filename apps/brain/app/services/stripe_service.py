import stripe
from typing import Optional, Dict, Any, List
from app.core.config import get_settings
from app.core.firebase import get_db
from datetime import datetime

settings = get_settings()

class StripeService:
    def __init__(self):
        if settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            self.stripe_enabled = True
        else:
            self.stripe_enabled = False
            print("⚠️ Stripe API Key missing. Using Mock Stripe mode.")

    async def create_customer(self, email: str, name: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Creates a new Stripe customer.
        """
        if not self.stripe_enabled:
            # Mock response
            return {
                "id": f"cus_mock_{datetime.now().timestamp()}",
                "email": email,
                "name": name,
                "metadata": metadata or {},
                "mock": True
            }

        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            return customer.to_dict()
        except stripe.error.StripeError as e:
            return {"error": str(e)}

    async def create_payment_intent(self, customer_id: str, amount: int, currency: str = "usd", 
                                   metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Creates a payment intent for a customer.
        """
        if not self.stripe_enabled:
            # Mock response
            return {
                "id": f"pi_mock_{datetime.now().timestamp()}",
                "customer": customer_id,
                "amount": amount,
                "currency": currency,
                "status": "requires_payment_method",
                "client_secret": f"pi_mock_{datetime.now().timestamp()}_secret",
                "mock": True
            }

        try:
            intent = stripe.PaymentIntent.create(
                customer=customer_id,
                amount=amount,
                currency=currency,
                metadata=metadata or {},
                automatic_payment_methods={
                    'enabled': True,
                },
            )
            return intent.to_dict()
        except stripe.error.StripeError as e:
            return {"error": str(e)}

    async def create_subscription(self, customer_id: str, price_id: str, 
                                 metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Creates a subscription for a customer.
        """
        if not self.stripe_enabled:
            # Mock response
            return {
                "id": f"sub_mock_{datetime.now().timestamp()}",
                "customer": customer_id,
                "items": [{"price": price_id}],
                "status": "active",
                "current_period_end": int(datetime.now().timestamp()) + 30 * 24 * 60 * 60,
                "mock": True
            }

        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                metadata=metadata or {}
            )
            return subscription.to_dict()
        except stripe.error.StripeError as e:
            return {"error": str(e)}

    async def list_payment_intents(self, customer_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Lists payment intents for a customer.
        """
        if not self.stripe_enabled:
            # Mock response
            return [
                {
                    "id": f"pi_mock_{datetime.now().timestamp()}",
                    "customer": customer_id,
                    "amount": 1000,
                    "currency": "usd",
                    "status": "succeeded",
                    "created": int(datetime.now().timestamp()),
                    "mock": True
                }
            ]

        try:
            intents = stripe.PaymentIntent.list(
                customer=customer_id,
                limit=limit
            )
            return [intent.to_dict() for intent in intents.data]
        except stripe.error.StripeError as e:
            return [{"error": str(e)}]

    async def sync_payment_to_firestore(self, payment_data: Dict[str, Any]) -> str:
        """
        Syncs payment data to Firestore for admin dashboard.
        """
        try:
            db = get_db()
            doc_ref = db.collection("payments").document()
            
            payment_record = {
                "customerId": payment_data.get("customer", ""),
                "customerName": payment_data.get("metadata", {}).get("customer_name", "Unknown"),
                "amount": payment_data.get("amount", 0) / 100,  # Convert cents to dollars
                "currency": payment_data.get("currency", "USD"),
                "status": payment_data.get("status", "pending"),
                "createdAt": datetime.utcnow(),
                "invoiceId": payment_data.get("id", ""),
                "subscriptionId": payment_data.get("subscription", ""),
                "stripeData": payment_data
            }
            
            doc_ref.set(payment_record)
            return doc_ref.id
        except Exception as e:
            print(f"Error syncing payment to Firestore: {e}")
            return ""

    async def create_checkout_session(self, price_id: str, customer_id: str, 
                                     success_url: str, cancel_url: str) -> Dict[str, Any]:
        """
        Creates a Stripe checkout session.
        """
        if not self.stripe_enabled:
            # Mock response
            return {
                "id": f"cs_mock_{datetime.now().timestamp()}",
                "url": f"https://checkout.stripe.com/mock/{datetime.now().timestamp()}",
                "mock": True
            }

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='payment',
                customer=customer_id,
                success_url=success_url,
                cancel_url=cancel_url,
            )
            return session.to_dict()
        except stripe.error.StripeError as e:
            return {"error": str(e)}

stripe_service = StripeService()