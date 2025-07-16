"""
Structured logging utility for Railway deployment
Provides JSON-formatted logs that Railway can parse and filter effectively
"""
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional, Union
from uuid import UUID
import traceback


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        # Base log structure
        log_entry = {
            "message": record.getMessage(),
            "level": record.levelname.lower(),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add any extra fields from the log record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'lineno', 'funcName', 'created', 
                          'msecs', 'relativeCreated', 'thread', 'threadName', 
                          'processName', 'process', 'getMessage', 'exc_info', 'exc_text', 'stack_info']:
                # Convert UUID objects to strings
                if isinstance(value, UUID):
                    value = str(value)
                # Convert other non-serializable objects to strings
                elif not isinstance(value, (str, int, float, bool, list, dict, type(None))):
                    value = str(value)
                extra_fields[key] = value
        
        if extra_fields:
            log_entry.update(extra_fields)
        
        return json.dumps(log_entry, ensure_ascii=False)


class StructuredLogger:
    """Structured logger wrapper for consistent logging across the application"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        
    def _log(self, level: str, message: str, **kwargs):
        """Internal method to log with structured data"""
        # Create a LogRecord with extra fields
        extra = {k: v for k, v in kwargs.items() if k not in ['exc_info']}
        
        # Get the appropriate logging method
        log_method = getattr(self.logger, level.lower())
        
        # Log with extra fields
        log_method(message, extra=extra, exc_info=kwargs.get('exc_info', False))
    
    def info(self, message: str, **kwargs):
        """Log info level message with structured data"""
        self._log('info', message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug level message with structured data"""
        self._log('debug', message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning level message with structured data"""
        self._log('warning', message, **kwargs)
    
    def warn(self, message: str, **kwargs):
        """Alias for warning"""
        self.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error level message with structured data"""
        self._log('error', message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical level message with structured data"""
        self._log('critical', message, **kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log exception with traceback"""
        kwargs['exc_info'] = True
        self._log('error', message, **kwargs)
    
    # Context-specific logging methods
    def log_request(self, method: str, url: str, status_code: int, 
                   user_id: Optional[str] = None, duration_ms: Optional[float] = None, **kwargs):
        """Log HTTP request with structured data"""
        self.info("HTTP request processed", 
                 request_method=method,
                 request_url=str(url),
                 response_status=status_code,
                 user_id=user_id,
                 duration_ms=duration_ms,
                 **kwargs)
    
    def log_database_operation(self, operation: str, table: str, 
                              user_id: Optional[str] = None, 
                              duration_ms: Optional[float] = None,
                              record_count: Optional[int] = None, **kwargs):
        """Log database operation with structured data"""
        self.info("Database operation completed",
                 db_operation=operation,
                 db_table=table,
                 user_id=user_id,
                 duration_ms=duration_ms,
                 record_count=record_count,
                 **kwargs)
    
    def log_chat_event(self, event_type: str, user_id: str, agent_id: str,
                      chat_thread_id: Optional[str] = None,
                      message_count: Optional[int] = None, **kwargs):
        """Log chat-related events with structured data"""
        self.info("Chat event occurred",
                 event_type=event_type,
                 user_id=user_id,
                 agent_id=agent_id,
                 chat_thread_id=chat_thread_id,
                 message_count=message_count,
                 **kwargs)
    
    def log_worker_event(self, worker_id: str, event_type: str, 
                        task_id: Optional[str] = None,
                        queue_name: Optional[str] = None, **kwargs):
        """Log worker-related events with structured data"""
        self.info("Worker event occurred",
                 worker_id=worker_id,
                 event_type=event_type,
                 task_id=task_id,
                 queue_name=queue_name,
                 **kwargs)
    
    def log_auth_event(self, event_type: str, user_id: Optional[str] = None,
                      success: bool = True, reason: Optional[str] = None, **kwargs):
        """Log authentication events with structured data"""
        level = 'info' if success else 'warning'
        self._log(level, "Authentication event occurred",
                 event_type=event_type,
                 user_id=user_id,
                 auth_success=success,
                 auth_failure_reason=reason,
                 **kwargs)


def setup_structured_logging(level: str = "INFO", enable_structured: bool = True):
    """
    Setup structured logging for the entire application
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        enable_structured: Whether to use structured JSON logging (True for production)
    """
    # Remove existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    
    if enable_structured:
        # Use structured JSON formatter for production
        formatter = StructuredFormatter()
    else:
        # Use simple formatter for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger.addHandler(console_handler)
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Reduce noise from external libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


def get_structured_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance"""
    return StructuredLogger(name)
