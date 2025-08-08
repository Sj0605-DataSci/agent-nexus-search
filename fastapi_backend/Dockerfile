# Use Python 3.11 as the base image
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install uv and dependencies
RUN pip install --no-cache-dir uv && \
    uv pip install --system --no-cache -r requirements.txt && \
    rm -rf /root/.cache

# Final stage
FROM python:3.11-slim
WORKDIR /app

# Copy installed dependencies
COPY --from=builder /usr/local /usr/local

# Create non-root user
RUN useradd -m myuser && \
    chown myuser /app
USER myuser

# Copy application
COPY --chown=myuser . .

# Environment variables for memory optimization
ENV PORT=8000
ENV HOST=0.0.0.0
ENV MALLOC_ARENA_MAX=2
ENV PYTHONUNBUFFERED=1
ENV PROCESS_TYPE=web
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONHASHSEED=random

# Expose port
EXPOSE 8000

# Run application with memory optimizations
CMD if [ "$PROCESS_TYPE" = "worker" ]; then \
        python -m app.core.worker_startup; \
    else \
        gunicorn app.main:app -w ${WEB_CONCURRENCY:-2} -k uvicorn.workers.UvicornWorker --bind ${HOST:-0.0.0.0}:${PORT:-8000} --max-requests 1000 --max-requests-jitter 100; \
    fi