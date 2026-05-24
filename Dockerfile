# syntax=docker/dockerfile:1.6
#
# PetCare backend image. Build from the repo root:
#   docker build -t petcare-backend .
#
# Mirrors the Heracles image layout. The container connects to a Postgres
# instance running on the host (see docker-compose.yml extra_hosts). We keep
# `ca-certificates` for outgoing TLS to Google / Apple OAuth token verification
# and Cloudinary uploads.

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# `curl` for HEALTHCHECK; `ca-certificates` for TLS to Google / Apple / Cloudinary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Deps first so code changes don't bust the pip cache.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend /app/backend

# Git SHA of the commit this image was built from. Injected as a build arg
# by deploy.sh; available at runtime via env so logs / debugging can pin
# which commit is live.
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}

# Drop root.
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Production launch: no --reload. 2 workers fits a small EC2 box and gives
# headroom for the asyncpg pool (1 pool per worker).
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
