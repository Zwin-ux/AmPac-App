"""
Sentry Configuration for AmPac Brain API

To enable Sentry:
1. Create a Sentry project at https://sentry.io
2. Add SENTRY_DSN to your .env file
3. Errors will be automatically captured and reported
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)

def init_sentry():
    """Initialize Sentry error tracking."""
    settings = get_settings()
    sentry_dsn = getattr(settings, 'SENTRY_DSN', None)
    
    if not sentry_dsn:
        logger.info("📊 Sentry DSN not configured, error reporting disabled")
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        
        # Set environment
        environment=settings.ENV,
        
        # Enable performance monitoring
        traces_sample_rate=0.1 if settings.ENV == "production" else 1.0,
        
        # Capture 100% of errors
        sample_rate=1.0,
        
        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            ),
        ],
        
        # Don't send PII by default
        send_default_pii=False,
        
        # Release version
        release=f"ampac-brain@{settings.VERSION}",
    )
    
    logger.info("📊 Sentry initialized for error tracking")


def capture_exception(error: Exception, context: dict = None):
    """Capture an exception with optional context."""
    settings = get_settings()
    sentry_dsn = getattr(settings, 'SENTRY_DSN', None)
    
    if not sentry_dsn:
        logger.error(f"Error: {error}", exc_info=True)
        return
    
    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info"):
    """Capture a message for logging."""
    settings = get_settings()
    sentry_dsn = getattr(settings, 'SENTRY_DSN', None)
    
    if not sentry_dsn:
        logger.log(getattr(logging, level.upper(), logging.INFO), message)
        return
    
    sentry_sdk.capture_message(message, level=level)


def set_user(user_id: str, email: str = None):
    """Set user context for error tracking."""
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
    })
