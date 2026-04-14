#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

TARGET="${1:-ios}"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed. Please install Node.js and npm first."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

case "$TARGET" in
  web)
    echo "Starting Expo on web..."
    npm run web
    ;;
  ios)
    echo "Starting Expo on iOS simulator..."
    npm run ios
    ;;
  android)
    echo "Starting Expo on Android emulator/device..."
    npm run android
    ;;
  start)
    echo "Starting Expo dev server..."
    npm run start
    ;;
  dev)
    echo "Starting Expo dev client..."
    npm run dev
    ;;
  build)
    echo "Building iOS development client..."
    npm run build:dev:ios
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: ./run-app.sh [web|ios|android|start|dev|build]"
    exit 1
    ;;
esac
