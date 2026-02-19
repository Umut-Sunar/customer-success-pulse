#!/bin/bash

# GitHub CLI ile login ve push
echo "🔐 GitHub CLI ile login yapılıyor..."
gh auth login

echo ""
echo "📦 GitHub'da repository oluşturuluyor..."
gh repo create customer-success-pulse --public --source=. --remote=origin --push

echo ""
echo "✅ Tamamlandı! Repository oluşturuldu ve push edildi!"
echo "🌐 Repository URL: https://github.com/$(gh api user --jq .login)/customer-success-pulse"

