#!/usr/bin/env bash
set -euo pipefail

# Wrapper: run existing sync-data.sh then ingest into local DB
./sync-data.sh

echo "Running backend ingest..."
python3 backend/ingest_runner.py worldcup2026.json
echo "Ingest complete."
