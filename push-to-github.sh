#!/bin/bash

# GitHub'a push script
set -e

echo "🚀 GitHub'a push işlemi başlatılıyor..."

cd "$(dirname "$0")"

# Remote URL'i güncelle
echo "🔗 Remote URL güncelleniyor..."
git remote set-url origin https://github.com/Umut-Sunar/customer-success-pulse.git

# Branch'i main yap
echo "🌿 Branch main olarak ayarlanıyor..."
git branch -M main 2>/dev/null || echo "Branch zaten main"

# Push et
echo "⬆️  GitHub'a push ediliyor..."
git push -u origin main

echo ""
echo "✅ Başarıyla GitHub'a push edildi!"
echo "🌐 Repository: https://github.com/Umut-Sunar/customer-success-pulse"

