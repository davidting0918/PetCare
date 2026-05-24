#!/bin/bash
#
# EC2-side deploy script. Run by GitHub Actions over SSH (see
# .github/workflows/deploy.yml) on every push to master, but also safe to
# run manually:  `ssh ec2 'cd ~/PetCare && bash deploy.sh'`.
#
# Steps:
#   1. Pull latest master (hard reset — EC2 is a mirror, never a branch).
#   2. Rebuild the backend container.
#   3. Wait for /health to report healthy (so the deploy fails loudly if
#      the new build can't reach Postgres, missing env vars, etc.).
#   4. Prune dangling images so the disk doesn't fill up over time.
#
# Assumes:
#   - cwd is the repo root (~/PetCare)
#   - .env.prod sits at repo root (gitignored, lives only on EC2)
#   - docker compose / git already installed
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "▶ Fetching origin/master…"
git fetch --quiet origin master

BEFORE=$(git rev-parse HEAD)
git reset --hard origin/master
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
    echo "ℹ Already at $AFTER — rebuilding anyway in case .env.prod / image base changed."
else
    echo "  $BEFORE → $AFTER"
fi

echo "▶ Rebuilding container…"
# Expose the short SHA to docker-compose so the Dockerfile bakes it into
# the image (surfaced at runtime via the GIT_SHA env var).
export GIT_SHA="$(git rev-parse --short HEAD)"
docker compose up -d --build --remove-orphans

echo "▶ Waiting for healthcheck…"
for i in $(seq 1 60); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' petcare-backend 2>/dev/null || echo "starting")
    if [ "$STATUS" = "healthy" ]; then
        echo "✓ Healthy after ${i}s"
        break
    fi
    if [ "$i" = "60" ]; then
        echo "✗ Container did not become healthy within 60s. Recent logs:"
        docker compose logs --tail=80
        exit 1
    fi
    sleep 1
done

echo "▶ Pruning dangling images…"
docker image prune -f >/dev/null

echo "✓ Deployed $AFTER"
