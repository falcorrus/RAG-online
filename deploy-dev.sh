#!/bin/bash

# Default commit message if none provided
MSG="${1:-Dev update $(date +'%Y-%m-%d %H:%M:%S')}"

echo "🧪 Starting DEV deployment..."

# 1. Add all changes
git add .

# 2. Commit
git commit -m "$MSG"

# 3. Push to Dev Remote
echo "📤 Pushing to Dev VPS..."
git push dev master

echo "✅ Done! Dev site updated: https://dev.rag.reloto.ru"
