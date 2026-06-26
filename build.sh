#!/usr/bin/env bash
set -e

echo "=== Installing pnpm ==="
npm install -g pnpm@9

echo "=== Installing workspace dependencies ==="
pnpm install --frozen-lockfile

echo "=== Building shared libs ==="
pnpm run typecheck:libs

echo "=== Building React frontend ==="
BASE_PATH=/ PORT=3000 NODE_ENV=production pnpm --filter @workspace/basketball-app run build

echo "=== Building API server ==="
NODE_ENV=production pnpm --filter @workspace/api-server run build

echo "=== Build complete ==="
