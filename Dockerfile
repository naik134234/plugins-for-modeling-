FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# gcc/g++ required for some python packages like numpy/pandas in some cases
# libpq-dev for psycopg2/asyncpg
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install gunicorn for production server
RUN pip install gunicorn

# Copy application code
COPY . .

# Set python path
ENV PYTHONPATH=/app

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Default command (can be overridden in docker-compose)
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "src.api.main:app", "--bind", "0.0.0.0:8000"]
