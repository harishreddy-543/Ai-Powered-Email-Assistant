FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for native compilations (like greenlet/psycopg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Train models on start if they don't exist, and launch FastAPI
CMD sh -c "python ml/train.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"
