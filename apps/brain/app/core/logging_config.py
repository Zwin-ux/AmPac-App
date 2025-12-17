import logging
import logging.config
import os
import contextvars

# Contextvar used by middleware to stamp request id on all logs
request_id_ctx_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx_var.get("-")
        return True


def init_logging() -> None:
    """
    Configure structured, request-aware logging. Uses logfmt for readability and ingestion.
    """
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"request_id": {"()": RequestIdFilter}},
        "formatters": {
            "logfmt": {
                "format": "%(asctime)s %(levelname)s %(name)s %(message)s request_id=%(request_id)s"
            }
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "formatter": "logfmt",
                "filters": ["request_id"]
            }
        },
        "root": {"handlers": ["default"], "level": log_level},
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": log_level, "propagate": False},
            "uvicorn.error": {"handlers": ["default"], "level": log_level, "propagate": False},
            "uvicorn.access": {"handlers": ["default"], "level": log_level, "propagate": False},
        }
    })
