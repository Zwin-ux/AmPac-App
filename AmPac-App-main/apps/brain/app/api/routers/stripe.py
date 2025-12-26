from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.stripe_service import stripe_service
from app.core.config import get_settings
from app.core.firebase_auth import AuthContext, get_current_user
import stripe

router = APIRouter()

settings = get_settings()

class CreateCustomerRequest(BaseModel):
    email: str
    name: str
    metadata: Optional[Dict[str, str]] = None

class CreatePaymentIntentRequest(BaseModel):
    customer_id: str
    amount: int
    currency: str = "usd"
    metadata: Optional[Dict[str, str]] = None

class CreateSubscriptionRequest(BaseModel):
    customer_id: str
    price_id: str
    metadata: Optional[Dict[str, str]] = None

class CreateCheckoutSessionRequest(BaseModel):
    price_id: str
    customer_id: str
    success_url: str
    cancel_url: str

# AmPac-specific request models
class ApplicationFeeRequest(BaseModel):
    application_id: str
    amount: int  # Amount in cents
    description: Optional[str] = None
    customer_email: Optional[str] = None

class PremiumSubscriptionRequest(BaseModel):
    price_id: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None

class RefundRequest(BaseModel):
    payment_intent_id: str
    amount: Optional[int] = None  # Optional partial refund amount

@router.post("/customers", response_model=Dict[str, Any])
async def create_customer(
    request: CreateCustomerRequest,
    user: AuthContext = Depends(get_current_user)
):
    """
    Creates a new Stripe customer.
    """
    try:
        customer = await stripe_service.create_customer(
            email=request.email,
            name=request.name,
            metadata=request.metadata
        )
        return customer
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment-intents", response_model=Dict[str, Any])
async def create_payment_intent(request: CreatePaymentIntentRequest, user: AuthContext = Depends(get_current_user)):
    """
    Creates a payment intent for a customer.
    """
    try:
        intent = await stripe_service.create_payment_intent(
            customer_id=request.customer_id,
            amount=request.amount,
            currency=request.currency,
            metadata=request.metadata
        )
        
        # Sync to Firestore for admin dashboard
        if not intent.get("error"):
            await stripe_service.sync_payment_to_firestore(intent)
            
        return intent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions", response_model=Dict[str, Any])
async def create_subscription(request: CreateSubscriptionRequest, user: AuthContext = Depends(get_current_user)):
    """
    Creates a subscription for a customer.
    """
    try:
        subscription = await stripe_service.create_subscription(
            customer_id=request.customer_id,
            price_id=request.price_id,
            metadata=request.metadata
        )
        return subscription
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/checkout-sessions", response_model=Dict[str, Any])
async def create_checkout_session(request: CreateCheckoutSessionRequest, user: AuthContext = Depends(get_current_user)):
    """
    Creates a Stripe checkout session.
    """
    try:
        session = await stripe_service.create_checkout_session(
            price_id=request.price_id,
            customer_id=request.customer_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payment-intents/{customer_id}", response_model=List[Dict[str, Any]])
async def list_payment_intents(customer_id: str, user: AuthContext = Depends(get_current_user)):
    """
    Lists payment intents for a customer.
    """
    try:
        intents = await stripe_service.list_payment_intents(customer_id)
        return intents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AmPac-specific endpoints

@router.post("/application-fee-session", response_model=Dict[str, Any])
async def create_application_fee_session(
    request: ApplicationFeeRequest,
    user: AuthContext = Depends(get_current_user)
):
    """
    Create Stripe Checkout session for loan application processing fee
    """
    try:
        # Validate request
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        if request.amount > 50000:  # $500 max application fee
            raise HTTPException(status_code=400, detail="Application fee cannot exceed $500")
        
        session_data = await stripe_service.create_application_fee_session(
            application_id=request.application_id,
            amount=request.amount,
            customer_email=request.customer_email,
            description=request.description
        )
        
        if session_data.get("error"):
            raise HTTPException(status_code=500, detail=session_data["error"])
        
        return session_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/premium-subscription-session", response_model=Dict[str, Any])
async def create_premium_subscription_session(
    request: PremiumSubscriptionRequest,
    user: AuthContext = Depends(get_current_user)
):
    """
    Create Stripe Checkout session for premium service subscription
    """
    try:
        session_data = await stripe_service.create_premium_subscription_session(
            price_id=request.price_id,
            customer_email=request.customer_email,
            customer_name=request.customer_name
        )
        
        if session_data.get("error"):
            raise HTTPException(status_code=500, detail=session_data["error"])
        
        return session_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/application-status/{application_id}", response_model=Dict[str, Any])
async def get_application_payment_status(
    application_id: str,
    user: AuthContext = Depends(get_current_user)
):
    """
    Get payment status for a loan application
    """
    try:
        status_data = await stripe_service.get_application_payment_status(application_id)
        
        if status_data.get("error"):
            raise HTTPException(status_code=500, detail=status_data["error"])
        
        return status_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refund", response_model=Dict[str, Any])
async def process_refund(
    request: RefundRequest,
    user: AuthContext = Depends(get_current_user)
):
    """
    Process refund for a payment (Admin only)
    """
    try:
        # Check if user has admin permissions
        # You might want to implement proper role checking here
        if not user.get('email', '').endswith('@ampac-business.com'):
            raise HTTPException(status_code=403, detail="Insufficient permissions for refund processing")
        
        refund_data = await stripe_service.process_refund(
            payment_intent_id=request.payment_intent_id,
            amount=request.amount
        )
        
        if refund_data.get("error"):
            raise HTTPException(status_code=500, detail=refund_data["error"])
        
        return refund_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handles Stripe webhook events.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Webhook secret not configured")
    
    try:
        # Read the raw request body
        body = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        
        # Verify the webhook signature
        try:
            event = stripe.Webhook.construct_event(
                body, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail=f"Invalid signature: {str(e)}")
        
        # Handle the event
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            await stripe_service.sync_payment_to_firestore(payment_intent)
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            await stripe_service.sync_payment_to_firestore(payment_intent)
        elif event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            # Handle successful checkout completion
            application_id = session.get('metadata', {}).get('application_id')
            if application_id:
                # Update application status in Firestore
                print(f"Payment completed for application {application_id}")
        elif event['type'] == 'customer.subscription.created':
            subscription = event['data']['object']
            # Handle subscription creation
            pass
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            # Handle subscription update
            pass
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            # Handle subscription deletion
            pass
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
