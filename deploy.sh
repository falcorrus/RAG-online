#!/bin/bash

# Default commit message if none provided
MSG="${1:-Update $(date +'%Y-%m-%d %H:%M:%S')}"

echo "🚀 Starting deployment..."
echo "📝 Commit message: '$MSG'"

# 1. Add all changes
git add .

# 2. Commit
git commit -m "$MSG"

# 3. Push to VPS (Deploys to /var/www/rag.reloto.ru)
echo "📤 Pushing to VPS..."
git push vps master

# 4. Push to GitHub (Backup)
echo "☁️  Pushing to GitHub..."
git push origin master

echo "✅ Done! Site updated."
