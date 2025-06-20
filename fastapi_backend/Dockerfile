# Use Python 3.11 as the base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install uv
RUN pip install uv

# Install dependencies using uv with system flag
RUN uv pip install --system --no-cache -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PORT=8000
ENV HOST=0.0.0.0

# Note: No sensitive credentials are stored in the Dockerfile
# Environment variables will be passed at runtime using --env-file
# For Railway deployment, set these in the Railway dashboard

# All API keys should be passed at runtime
# Do not hardcode sensitive information in the Dockerfile


# Expose the port the app runs on
EXPOSE 8000
