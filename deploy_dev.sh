#!/bin/bash

# Default commit message if none provided
MSG="${1:-Dev Update $(date +'%Y-%m-%d %H:%M:%S')}"

echo "🚀 Starting DEV deployment..."

echo "📝 Commit message: '$MSG'"

# 1. Add all changes
git add .

# 2. Commit
git commit -m "$MSG"

# 3. Push to DEV VPS
echo "📤 Pushing to DEV VPS..."
git push dev master

echo "✅ Done! Dev site updated at https://dev.rag.reloto.ru/"
