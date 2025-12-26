"""
Payment service for AmPac Business Capital
Handles Stripe integration for loan application fees and premium services
"""

import stripe
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.core.config import settings

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class ApplicationFeeRequest(BaseModel):
    application_id: str
    amount: int  # Amount in cents
    description: Optional[str] = None
    customer_email: Optional[str] = None

class SubscriptionRequest(BaseModel):
    customer_id: Optional[str] = None
    price_id: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None

class RefundRequest(BaseModel):
    payment_intent_id: str
    amount: Optional[int] = None  # Optional partial refund amount

class PaymentService:
    """Service for handling Stripe payments in AmPac ecosystem"""
    
    def __init__(self):
        self.success_url = f"{settings.FRONTEND_URL}/payment/success"
        self.cancel_url = f"{settings.FRONTEND_URL}/payment/cancel"
    
    async def create_application_fee_session(self, request: ApplicationFeeRequest) -> Dict[str, Any]:
        """
        Create Stripe Checkout session for loan application processing fee
        
        Args:
            request: Application fee request data
            
        Returns:
            Dict containing session ID, URL, and payment details
        """
        try:
            # Create checkout session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'Loan Application Processing Fee',
                            'description': request.description or f'Processing fee for application {request.application_id}',
                            'metadata': {
                                'application_id': request.application_id,
                                'service_type': 'application_fee'
                            }
                        },
                        'unit_amount': request.amount,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                customer_email=request.customer_email,
                success_url=f"{self.success_url}?session_id={{CHECKOUT_SESSION_ID}}&application_id={request.application_id}",
                cancel_url=f"{self.cancel_url}?application_id={request.application_id}",
                metadata={
                    'application_id': request.application_id,
                    'type': 'application_fee',
                    'service': 'loan_processing'
                },
                # Enable automatic tax calculation if configured
                automatic_tax={'enabled': True} if hasattr(settings, 'STRIPE_TAX_ENABLED') else {},
            )
            
            return {
                'session_id': session.id,
                'url': session.url,
                'amount': request.amount,
                'currency': 'usd',
                'description': request.description or f'Application fee for {request.application_id}',
                'application_id': request.application_id
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Payment session creation failed: {str(e)}")
    
    async def create_subscription_session(self, request: SubscriptionRequest) -> Dict[str, Any]:
        """
        Create Stripe Checkout session for premium service subscription
        
        Args:
            request: Subscription request data
            
        Returns:
            Dict containing session ID, URL, and subscription details
        """
        try:
            # Create or retrieve customer if needed
            customer_id = request.customer_id
            if not customer_id and request.customer_email:
                customer = stripe.Customer.create(
                    email=request.customer_email,
                    name=request.customer_name,
                    metadata={
                        'service': 'ampac_premium',
                        'source': 'mobile_app'
                    }
                )
                customer_id = customer.id
            
            session_params = {
                'payment_method_types': ['card'],
                'mode': 'subscription',
                'line_items': [{
                    'price': request.price_id,
                    'quantity': 1,
                }],
                'success_url': f"{self.success_url}?session_id={{CHECKOUT_SESSION_ID}}&type=subscription",
                'cancel_url': f"{self.cancel_url}?type=subscription",
                'metadata': {
                    'type': 'subscription',
                    'service': 'premium_features'
                }
            }
            
            if customer_id:
                session_params['customer'] = customer_id
            elif request.customer_email:
                session_params['customer_email'] = request.customer_email
            
            session = stripe.checkout.Session.create(**session_params)
            
            return {
                'session_id': session.id,
                'url': session.url,
                'price_id': request.price_id,
                'customer_id': customer_id,
                'type': 'subscription'
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Subscription session creation failed: {str(e)}")
    
    async def get_payment_status(self, application_id: str) -> Dict[str, Any]:
        """
        Get payment status for a loan application
        
        Args:
            application_id: The loan application ID
            
        Returns:
            Dict containing payment status and details
        """
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
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Payment status check failed: {str(e)}")
    
    async def process_refund(self, request: RefundRequest) -> Dict[str, Any]:
        """
        Process refund for a payment
        
        Args:
            request: Refund request data
            
        Returns:
            Dict containing refund details
        """
        try:
            refund_params = {
                'payment_intent': request.payment_intent_id,
                'metadata': {
                    'service': 'ampac_refund',
                    'processed_by': 'api'
                }
            }
            
            if request.amount:
                refund_params['amount'] = request.amount
            
            refund = stripe.Refund.create(**refund_params)
            
            return {
                'refund_id': refund.id,
                'status': refund.status,
                'amount': refund.amount,
                'currency': refund.currency,
                'payment_intent_id': request.payment_intent_id
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Refund processing failed: {str(e)}")
    
    async def handle_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Handle Stripe webhook events
        
        Args:
            payload: Raw webhook payload
            signature: Stripe signature header
            
        Returns:
            Dict containing event processing result
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
            
            # Handle different event types
            if event['type'] == 'checkout.session.completed':
                session = event['data']['object']
                await self._handle_successful_payment(session)
            
            elif event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                await self._handle_payment_intent_succeeded(payment_intent)
            
            elif event['type'] == 'customer.subscription.created':
                subscription = event['data']['object']
                await self._handle_subscription_created(subscription)
            
            elif event['type'] == 'invoice.payment_failed':
                invoice = event['data']['object']
                await self._handle_payment_failed(invoice)
            
            return {'status': 'success', 'event_type': event['type']}
            
        except ValueError as e:
            raise Exception(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise Exception(f"Invalid signature: {str(e)}")
        except Exception as e:
            raise Exception(f"Webhook processing failed: {str(e)}")
    
    async def _handle_successful_payment(self, session: Dict[str, Any]):
        """Handle successful payment completion"""
        application_id = session.get('metadata', {}).get('application_id')
        if application_id:
            # Update application status in Firestore
            # This would integrate with your existing Firebase service
            print(f"Payment successful for application {application_id}")
    
    async def _handle_payment_intent_succeeded(self, payment_intent: Dict[str, Any]):
        """Handle successful payment intent"""
        print(f"Payment intent succeeded: {payment_intent['id']}")
    
    async def _handle_subscription_created(self, subscription: Dict[str, Any]):
        """Handle new subscription creation"""
        customer_id = subscription.get('customer')
        print(f"New subscription created for customer {customer_id}")
    
    async def _handle_payment_failed(self, invoice: Dict[str, Any]):
        """Handle failed payment"""
        customer_id = invoice.get('customer')
        print(f"Payment failed for customer {customer_id}")

# Create service instance
payment_service = PaymentService()