"""
Payment API routes for AmPac Business Capital
Handles Stripe integration endpoints
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from app.services.payment_service import (
    payment_service, 
    ApplicationFeeRequest, 
    SubscriptionRequest, 
    RefundRequest
)
from app.core.auth import get_current_user
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/create-application-fee-session")
async def create_application_fee_session(
    request: ApplicationFeeRequest,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create Stripe Checkout session for loan application processing fee
    
    Args:
        request: Application fee request data
        current_user: Authenticated user data
        
    Returns:
        Checkout session details including URL and session ID
    """
    try:
        logger.info(f"Creating application fee session for application {request.application_id}")
        
        # Validate request
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        if request.amount > 50000:  # $500 max application fee
            raise HTTPException(status_code=400, detail="Application fee cannot exceed $500")
        
        session_data = await payment_service.create_application_fee_session(request)
        
        logger.info(f"Application fee session created: {session_data['session_id']}")
        return session_data
        
    except Exception as e:
        logger.error(f"Failed to create application fee session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-subscription-session")
async def create_subscription_session(
    request: SubscriptionRequest,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create Stripe Checkout session for premium service subscription
    
    Args:
        request: Subscription request data
        current_user: Authenticated user data
        
    Returns:
        Checkout session details including URL and session ID
    """
    try:
        logger.info(f"Creating subscription session for price {request.price_id}")
        
        session_data = await payment_service.create_subscription_session(request)
        
        logger.info(f"Subscription session created: {session_data['session_id']}")
        return session_data
        
    except Exception as e:
        logger.error(f"Failed to create subscription session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{application_id}")
async def get_payment_status(
    application_id: str,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get payment status for a loan application
    
    Args:
        application_id: The loan application ID
        current_user: Authenticated user data
        
    Returns:
        Payment status and details
    """
    try:
        logger.info(f"Getting payment status for application {application_id}")
        
        status_data = await payment_service.get_payment_status(application_id)
        
        return status_data
        
    except Exception as e:
        logger.error(f"Failed to get payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refund")
async def process_refund(
    request: RefundRequest,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Process refund for a payment
    
    Args:
        request: Refund request data
        current_user: Authenticated user data
        
    Returns:
        Refund details and status
    """
    try:
        logger.info(f"Processing refund for payment intent {request.payment_intent_id}")
        
        # Additional authorization check for refunds
        # In production, you might want to restrict this to admin users
        if not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Insufficient permissions for refund processing")
        
        refund_data = await payment_service.process_refund(request)
        
        logger.info(f"Refund processed: {refund_data['refund_id']}")
        return refund_data
        
    except Exception as e:
        logger.error(f"Failed to process refund: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events
    
    Args:
        request: FastAPI request object containing webhook payload
        
    Returns:
        Success response for Stripe
    """
    try:
        payload = await request.body()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        result = await payment_service.handle_webhook(payload, signature)
        
        logger.info(f"Webhook processed successfully: {result['event_type']}")
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/health")
async def payment_health_check():
    """
    Health check endpoint for payment service
    
    Returns:
        Service health status
    """
    try:
        # Basic Stripe API connectivity check
        import stripe
        stripe.Account.retrieve()
        
        return {
            "status": "healthy",
            "service": "payment_service",
            "stripe_connected": True
        }
        
    except Exception as e:
        logger.error(f"Payment service health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "payment_service",
            "stripe_connected": False,
            "error": str(e)
        }

# Additional utility endpoints for development/testing

@router.get("/test-prices")
async def get_test_prices():
    """
    Get available test prices for development
    Only available in development environment
    """
    try:
        import stripe
        from app.core.config import settings
        
        if settings.ENV != "development":
            raise HTTPException(status_code=404, detail="Not available in production")
        
        prices = stripe.Price.list(limit=10, active=True)
        
        return {
            "prices": [
                {
                    "id": price.id,
                    "nickname": price.nickname,
                    "unit_amount": price.unit_amount,
                    "currency": price.currency,
                    "recurring": price.recurring
                }
                for price in prices.data
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch test prices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))