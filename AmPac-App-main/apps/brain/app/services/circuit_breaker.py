from datetime import datetime, timedelta
from typing import Dict, Optional
from app.core.config import get_settings


class CircuitBreaker:
    """
    Minimal circuit breaker to guard external integrations.
    """

    def __init__(self, name: str, failure_threshold: int, reset_timeout_seconds: int):
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout_seconds = reset_timeout_seconds
        self.failure_count = 0
        self.state = "closed"  # closed | open | half_open
        self.opened_at: Optional[datetime] = None
        self.last_error: Optional[str] = None

    def allow_request(self) -> bool:
        if self.state == "open" and self.opened_at:
            if datetime.utcnow() - self.opened_at >= timedelta(seconds=self.reset_timeout_seconds):
                # Move to half-open to allow a probe
                self.state = "half_open"
                return True
            return False
        return True

    def record_success(self):
        self.failure_count = 0
        self.state = "closed"
        self.last_error = None
        self.opened_at = None

    def record_failure(self, error: str):
        self.failure_count += 1
        self.last_error = error
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            self.opened_at = datetime.utcnow()

    def force_open(self, reason: str = "manual"):
        self.state = "open"
        self.opened_at = datetime.utcnow()
        self.last_error = reason

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "state": self.state,
            "failureCount": self.failure_count,
            "failureThreshold": self.failure_threshold,
            "resetTimeoutSeconds": self.reset_timeout_seconds,
            "openedAt": self.opened_at.isoformat() if self.opened_at else None,
            "lastError": self.last_error,
        }


_breakers: Dict[str, CircuitBreaker] = {}


def get_breaker(name: str) -> CircuitBreaker:
    if name not in _breakers:
        settings = get_settings()
        _breakers[name] = CircuitBreaker(
            name=name,
            failure_threshold=settings.BREAKER_FAILURE_THRESHOLD,
            reset_timeout_seconds=settings.BREAKER_RESET_SECONDS,
        )
    return _breakers[name]


def get_breaker_states() -> Dict[str, Dict]:
    return {name: br.to_dict() for name, br in _breakers.items()}


def force_open_breaker(name: str, reason: str = "manual"):
    br = get_breaker(name)
    br.force_open(reason)
    return br


def reset_breaker(name: str):
    br = get_breaker(name)
    br.record_success()
    return br
