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

ENV PORT=8000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8000

# Run application
CMD uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
