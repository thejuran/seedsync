#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting DVC Dashboard on port ${PORT:-8000}..."
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
