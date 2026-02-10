import logging
import logging.config
import sys
from pathlib import Path
from typing import Optional
import yaml
import structlog
from structlog.contextvars import clear_contextvars, bind_contextvars


class TraceIdFilter(logging.Filter):
    """Filter to add trace_id to log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        # Try to get trace_id from log record
        trace_id = getattr(record, 'trace_id', None)
        if trace_id:
            record.trace_id = trace_id
        else:
            record.trace_id = "N/A"
        return True


def setup_logging(
    config_path: Optional[Path] = None,
    environment: str = "development",
    log_level: str = "INFO"
) -> None:
    """
    Configure structured logging for the application.
    
    Args:
        config_path: Path to logging configuration YAML file
        environment: Deployment environment
        log_level: Minimum log level
    """
    # Create logs directory
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Load configuration if provided
    if config_path and config_path.exists():
        with open(config_path) as f:
            logging_config = yaml.safe_load(f)
        logging.config.dictConfig(logging_config)
    
    # Configure structlog for structured logging
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.dev.ConsoleRenderer() if environment == "development" 
                else structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True
    )
    
    # Set up standard logging
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear any existing handlers
    root_logger.handlers.clear()
    
    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s:%(funcName)s:%(lineno)d - %(message)s"
    )
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    configure_library_loggers()


def configure_library_loggers() -> None:
    """Configure logging levels for third-party libraries."""
    library_log_levels = {
        "uvicorn": "INFO",
        "uvicorn.access": "WARNING",
        "sqlalchemy.engine": "WARNING",
        "sqlalchemy.pool": "WARNING",
        "celery": "WARNING",
        "kombu": "WARNING",
        "redis": "WARNING",
        "httpx": "WARNING",
    }
    
    for logger_name, level in library_log_levels.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(getattr(logging, level))


class LoggerMixin:
    """Mixin class to add logger to any class."""
    
    @property
    def logger(self) -> structlog.stdlib.BoundLogger:
        """Get logger for this class."""
        return structlog.get_logger(self.__class__.__name__)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a named logger."""
    return structlog.get_logger(name)
