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
        
        # AmPac-specific URLs
        self.success_url = "https://ampac-business.com/payment/success"
        self.cancel_url = "https://ampac-business.com/payment/cancel"

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

    # AmPac-specific payment methods

    async def create_application_fee_session(self, application_id: str, amount: int, 
                                           customer_email: Optional[str] = None,
                                           description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create Stripe Checkout session for loan application processing fee
        """
        if not self.stripe_enabled:
            return {
                "session_id": f"cs_mock_{datetime.now().timestamp()}",
                "url": f"https://checkout.stripe.com/mock/application/{application_id}",
                "amount": amount,
                "currency": "usd",
                "description": description or f"Application fee for {application_id}",
                "application_id": application_id,
                "mock": True
            }

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'Loan Application Processing Fee',
                            'description': description or f'Processing fee for application {application_id}',
                        },
                        'unit_amount': amount,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                customer_email=customer_email,
                success_url=f"{self.success_url}?session_id={{CHECKOUT_SESSION_ID}}&application_id={application_id}",
                cancel_url=f"{self.cancel_url}?application_id={application_id}",
                metadata={
                    'application_id': application_id,
                    'type': 'application_fee',
                    'service': 'loan_processing'
                }
            )
            
            return {
                'session_id': session.id,
                'url': session.url,
                'amount': amount,
                'currency': 'usd',
                'description': description or f'Application fee for {application_id}',
                'application_id': application_id
            }
            
        except stripe.error.StripeError as e:
            return {"error": str(e)}

    async def create_premium_subscription_session(self, price_id: str, customer_email: Optional[str] = None,
                                                customer_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Create Stripe Checkout session for premium service subscription
        """
        if not self.stripe_enabled:
            return {
                "session_id": f"cs_mock_{datetime.now().timestamp()}",
                "url": f"https://checkout.stripe.com/mock/subscription/{price_id}",
                "price_id": price_id,
                "type": "subscription",
                "mock": True
            }

        try:
            session_params = {
                'payment_method_types': ['card'],
                'mode': 'subscription',
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'success_url': f"{self.success_url}?session_id={{CHECKOUT_SESSION_ID}}&type=subscription",
                'cancel_url': f"{self.cancel_url}?type=subscription",
                'metadata': {
                    'type': 'subscription',
                    'service': 'premium_features'
                }
            }
            
            if customer_email:
                session_params['customer_email'] = customer_email
            
            session = stripe.checkout.Session.create(**session_params)
            
            return {
                'session_id': session.id,
                'url': session.url,
                'price_id': price_id,
                'type': 'subscription'
            }
            
        except stripe.error.StripeError as e:
            return {"error": str(e)}

    async def get_application_payment_status(self, application_id: str) -> Dict[str, Any]:
        """
        Get payment status for a loan application
        """
        if not self.stripe_enabled:
            return {
                'status': 'paid',
                'session_id': f'cs_mock_{application_id}',
                'payment_intent_id': f'pi_mock_{application_id}',
                'amount_total': 5000,
                'currency': 'usd',
                'mock': True
            }

        try:
            # Search for checkout sessions with this application ID
            sessions = stripe.checkout.Session.list(
                limit=10,
                expand=['data.payment_intent']
            )
            
            for session in sessions.data:
                if session.metadata and session.metadata.get('application_id') == application_id:
                    payment_intent = session.payment_intent
                    return {
                        'status': session.payment_status,
                        'session_id': session.id,
                        'payment_intent_id': payment_intent.id if payment_intent else None,
                        'amount_total': session.amount_total,
                        'currency': session.currency
                    }
            
            return {'status': 'not_found'}
            
        except stripe.error.StripeError as e:
            return {"error": str(e)}

    async def process_refund(self, payment_intent_id: str, amount: Optional[int] = None) -> Dict[str, Any]:
        """
        Process refund for a payment
        """
        if not self.stripe_enabled:
            return {
                'refund_id': f're_mock_{datetime.now().timestamp()}',
                'status': 'succeeded',
                'amount': amount or 5000,
                'currency': 'usd',
                'payment_intent_id': payment_intent_id,
                'mock': True
            }

        try:
            refund_params = {
                'payment_intent': payment_intent_id,
                'metadata': {
                    'service': 'ampac_refund',
                    'processed_by': 'api'
                }
            }
            
            if amount:
                refund_params['amount'] = amount
            
            refund = stripe.Refund.create(**refund_params)
            
            return {
                'refund_id': refund.id,
                'status': refund.status,
                'amount': refund.amount,
                'currency': refund.currency,
                'payment_intent_id': payment_intent_id
            }
            
        except stripe.error.StripeError as e:
            return {"error": str(e)}

stripe_service = StripeService()