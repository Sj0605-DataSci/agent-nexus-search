import time
import asyncio
import random
from typing import List, Dict, Optional, Any
from collections import deque
import logging
import tiktoken
import json

logger = logging.getLogger(__name__)

class JinaRateLimiter:
    """
    Rate limiter for Jina API that handles both request rate limits (RPM) and token rate limits (TPM).
    Uses a sliding window approach to track API usage and implements retry logic with exponential backoff.
    """
    
    def __init__(
        self,
        rpm_limit: int = 500,  # 500 requests per minute
        tpm_limit: int = 1_000_000,  # 1 million tokens per minute
        window_size: int = 60,  # 1 minute window in seconds
        safety_margin: float = 0.9,  # Use 90% of limits as safety margin
    ):
        # Rate limits with safety margin
        self.rpm_limit = int(rpm_limit * safety_margin)  # Apply safety margin
        self.tpm_limit = int(tpm_limit * safety_margin)  # Apply safety margin
        self.window_size = window_size
        self.safety_margin = safety_margin
        
        # Original limits (for logging)
        self.original_rpm_limit = rpm_limit
        self.original_tpm_limit = tpm_limit
        
        # Sliding windows for tracking
        self.request_timestamps = deque()
        self.token_usage = deque()
        
        # Tiktoken encoder for counting tokens
        self.encoder = tiktoken.get_encoding("cl100k_base")  # Using OpenAI's encoder which works well for most text
        
        # Last rate limit hit time (for backoff)
        self.last_rpm_hit = 0
        self.last_tpm_hit = 0
        
        # Global throttling state
        self.is_throttling = False
        self.throttle_until = 0
        self.throttle_factor = 1.0  # 1.0 = no throttling, higher = more throttling
        
        logger.info(f"Initialized Jina rate limiter with {self.rpm_limit}/{rpm_limit} RPM and {self.tpm_limit}/{tpm_limit} TPM limits (with {int(safety_margin*100)}% safety margin)")
    
    def count_tokens(self, texts: List[str]) -> int:
        """Count the number of tokens in a list of texts."""
        if not texts:
            return 0
            
        total_tokens = 0
        for text in texts:
            if text and isinstance(text, str):
                tokens = self.encoder.encode(text)
                total_tokens += len(tokens)
        
        return total_tokens
    
    def _clean_old_entries(self, current_time: float):
        """Remove entries older than the window size."""
        # Clean request timestamps
        while self.request_timestamps and (current_time - self.request_timestamps[0]) > self.window_size:
            self.request_timestamps.popleft()
        
        # Clean token usage
        while self.token_usage and (current_time - self.token_usage[0][0]) > self.window_size:
            self.token_usage.popleft()
    
    def _get_current_usage(self) -> tuple:
        """Get current request and token counts within the window."""
        current_time = time.time()
        self._clean_old_entries(current_time)
        
        request_count = len(self.request_timestamps)
        token_count = sum(tokens for _, tokens in self.token_usage)
        
        return request_count, token_count
    
    def _calculate_wait_time(self, is_rpm_limited: bool, is_tpm_limited: bool) -> float:
        """Calculate wait time with exponential backoff if rate limited."""
        current_time = time.time()
        wait_time = 0
        
        if is_rpm_limited:
            # Exponential backoff based on how recently we hit the RPM limit
            time_since_last_hit = current_time - self.last_rpm_hit
            if time_since_last_hit < 60:  # If we hit the limit recently
                # Base wait of 1-2 seconds with exponential increase for repeated hits
                base_wait = random.uniform(1, 2)
                exp_factor = max(1, 5 - time_since_last_hit / 12)  # Decreases over time
                rpm_wait = base_wait * exp_factor
                wait_time = max(wait_time, rpm_wait)
            
            self.last_rpm_hit = current_time
        
        if is_tpm_limited:
            # Similar logic for TPM limit
            time_since_last_hit = current_time - self.last_tpm_hit
            if time_since_last_hit < 60:
                base_wait = random.uniform(2, 4)  # TPM limit is more severe
                exp_factor = max(1, 8 - time_since_last_hit / 8)
                tpm_wait = base_wait * exp_factor
                wait_time = max(wait_time, tpm_wait)
            
            self.last_tpm_hit = current_time
        
        # Add small jitter to prevent thundering herd
        wait_time += random.uniform(0.1, 0.5)
        
        return wait_time
    
    async def wait_if_needed(self, texts: List[str]) -> None:
        """
        Check if the request would exceed rate limits and wait if necessary.
        
        Args:
            texts: List of texts to be sent to the API
        """
        token_count = self.count_tokens(texts)
        current_time = time.time()
        
        # Check if we're in global throttling mode
        if self.is_throttling and current_time < self.throttle_until:
            # Apply throttling delay
            throttle_wait = random.uniform(1, 3) * self.throttle_factor
            logger.info(f"Global throttling active. Adding {throttle_wait:.2f}s delay")
            await asyncio.sleep(throttle_wait)
        
        # Define warning thresholds (percentage of limit)
        warning_threshold = 0.7  # 70% of limit
        critical_threshold = 0.85  # 85% of limit
        
        while True:
            request_count, current_tokens = self._get_current_usage()
            
            # Calculate usage percentages
            rpm_usage = request_count / self.rpm_limit if self.rpm_limit > 0 else 0
            tpm_usage = (current_tokens + token_count) / self.tpm_limit if self.tpm_limit > 0 else 0
            
            # Determine if we're approaching or exceeding limits
            is_rpm_limited = rpm_usage >= 1.0
            is_tpm_limited = tpm_usage >= 1.0
            is_rpm_warning = rpm_usage >= warning_threshold and not is_rpm_limited
            is_tpm_warning = tpm_usage >= warning_threshold and not is_tpm_limited
            
            # If we're approaching limits, activate global throttling
            if (rpm_usage >= critical_threshold or tpm_usage >= critical_threshold) and not self.is_throttling:
                self.is_throttling = True
                self.throttle_until = current_time + 30  # Throttle for 30 seconds
                self.throttle_factor = max(rpm_usage, tpm_usage) * 2  # Scale throttling based on usage
                logger.warning(f"Activating global throttling for 30s with factor {self.throttle_factor:.2f}")
            
            # If we're below limits, we can proceed
            if not is_rpm_limited and not is_tpm_limited:
                # If we're approaching limits, add a small preventive delay
                if is_rpm_warning or is_tpm_warning:
                    warning_wait = random.uniform(0.5, 2.0) * max(rpm_usage, tpm_usage)
                    logger.info(f"Approaching limits - RPM: {rpm_usage:.2%}, TPM: {tpm_usage:.2%}. Adding {warning_wait:.2f}s preventive delay")
                    await asyncio.sleep(warning_wait)
                break
            
            # Calculate wait time based on how far we are over the limit
            base_wait = self._calculate_wait_time(is_rpm_limited, is_tpm_limited)
            
            # Add extra wait time proportional to how far we are over the limit
            extra_factor = max(
                1.0,
                rpm_usage if is_rpm_limited else 0,
                tpm_usage if is_tpm_limited else 0
            )
            wait_time = base_wait * extra_factor
            
            if is_rpm_limited:
                logger.warning(f"RPM limit reached ({request_count}/{self.rpm_limit}, {rpm_usage:.2%} of {self.original_rpm_limit}). Waiting {wait_time:.2f}s")
            if is_tpm_limited:
                logger.warning(f"TPM limit reached ({current_tokens + token_count}/{self.tpm_limit}, {tpm_usage:.2%} of {self.original_tpm_limit}). Waiting {wait_time:.2f}s")
            
            # Activate global throttling when we hit limits
            self.is_throttling = True
            self.throttle_until = current_time + 60  # Throttle for 60 seconds after hitting a limit
            self.throttle_factor = extra_factor * 2  # Scale throttling based on usage
            
            await asyncio.sleep(wait_time)
            
            # Clean up old entries after waiting
            self._clean_old_entries(time.time())
    
    def record_usage(self, texts: List[str]):
        """
        Record API usage after a successful request.
        
        Args:
            texts: List of texts sent to the API
        """
        current_time = time.time()
        token_count = self.count_tokens(texts)
        
        # Record request timestamp
        self.request_timestamps.append(current_time)
        
        # Record token usage
        self.token_usage.append((current_time, token_count))
        
        # Clean up old entries
        self._clean_old_entries(current_time)
        
        request_count, current_tokens = self._get_current_usage()
        logger.debug(f"Current usage: {request_count}/{self.rpm_limit} RPM, {current_tokens}/{self.tpm_limit} TPM")
    
    async def execute_with_rate_limit(self, api_func, texts: List[str], *args, **kwargs):
        """
        Execute an API function with rate limiting and retry logic.
        
        Args:
            api_func: Async function to call the API
            texts: List of texts to be sent to the API
            *args, **kwargs: Additional arguments to pass to the API function
            
        Returns:
            API response
        """
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            # Wait if we're approaching rate limits
            await self.wait_if_needed(texts)
            
            try:
                # Call the API function
                response = await api_func(texts, *args, **kwargs)
                
                # Record usage on success
                self.record_usage(texts)
                
                return response
                
            except Exception as e:
                retry_count += 1
                error_str = str(e)
                
                # Check if it's a rate limit error - specifically check for Jina's format
                is_rate_limit_error = any(
                    phrase in error_str.lower() 
                    for phrase in ["rate limit", "too many requests", "429"]
                )
                
                # Special check for Jina's token rate limit format
                is_jina_token_limit = "token rate limit exceeded" in error_str.lower() or "token rate limit" in error_str.lower()
                
                if is_jina_token_limit:
                    # More aggressive backoff for token limit - exponential with retry count
                    base_wait = min(30, 5 * retry_count) + random.uniform(1, 5)
                    # Add exponential component based on how recently we hit the limit
                    time_since_last_hit = time.time() - self.last_tpm_hit
                    if time_since_last_hit < 30:  # If we hit the limit very recently
                        # More aggressive backoff when hitting limits in quick succession
                        exp_factor = max(1, 10 - time_since_last_hit / 3)  # Higher factor for recent hits
                        wait_time = base_wait * exp_factor
                    else:
                        wait_time = base_wait
                    
                    # Log detailed information about the rate limit
                    logger.warning(f"Jina token rate limit exceeded. Details: {error_str}")
                    logger.warning(f"Retry {retry_count}/{max_retries} after {wait_time:.2f}s")
                    logger.warning(f"Current token usage: {sum(tokens for _, tokens in self.token_usage)}/{self.tpm_limit} TPM")
                    
                    # Update last hit time for future calculations
                    self.last_tpm_hit = time.time()
                    
                    # Force clear token usage tracking to be extra cautious
                    current_time = time.time()
                    cutoff_time = current_time - (self.window_size * 0.5)  # Clear half the window
                    while self.token_usage and self.token_usage[0][0] < cutoff_time:
                        self.token_usage.popleft()
                    
                    # Add jitter to prevent thundering herd
                    wait_time += random.uniform(0.5, 2.0)
                    
                    await asyncio.sleep(wait_time)
                elif is_rate_limit_error:
                    wait_time = self._calculate_wait_time(True, True)  # Assume both limits hit
                    logger.warning(f"Rate limit error from API. Retry {retry_count}/{max_retries} after {wait_time:.2f}s")
                    await asyncio.sleep(wait_time)
                elif retry_count < max_retries:
                    # For other errors, use standard exponential backoff
                    wait_time = 2 ** retry_count + random.uniform(0, 1)
                    logger.warning(f"API error: {error_str}. Retry {retry_count}/{max_retries} after {wait_time:.2f}s")
                    await asyncio.sleep(wait_time)
                else:
                    # Max retries reached
                    logger.error(f"Max retries reached. Last error: {error_str}")
                    raise
        
        raise Exception(f"Failed after {max_retries} retries")

# Global instance for app-wide rate limiting
jina_rate_limiter = JinaRateLimiter()
