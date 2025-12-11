from fastapi import APIRouter, HTTPException, Request, Security
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.stripe_service import stripe_service
from app.core.config import get_settings
from app.core.auth import get_current_user_or_api_key, require_admin
import hmac
import hashlib
import json

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

@router.post("/customers", response_model=Dict[str, Any])
async def create_customer(
    request: CreateCustomerRequest,
    user: dict = Security(get_current_user_or_api_key)
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
async def create_payment_intent(request: CreatePaymentIntentRequest):
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
async def create_subscription(request: CreateSubscriptionRequest):
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
async def create_checkout_session(request: CreateCheckoutSessionRequest):
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
async def list_payment_intents(customer_id: str):
    """
    Lists payment intents for a customer.
    """
    try:
        intents = await stripe_service.list_payment_intents(customer_id)
        return intents
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