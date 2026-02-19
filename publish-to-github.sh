#!/bin/bash

# GitHub'a Publish Script
# Bu script'i çalıştırmak için: bash publish-to-github.sh

set -e

echo "🚀 GitHub'a publish işlemi başlatılıyor..."

# Proje klasörüne git
cd "$(dirname "$0")"

# Git repository initialize et (eğer yoksa)
if [ ! -d ".git" ]; then
    echo "📦 Git repository initialize ediliyor..."
    git init
fi

# Tüm dosyaları ekle
echo "📝 Dosyalar stage'e ekleniyor..."
git add .

# Commit yap
echo "💾 Commit yapılıyor..."
git commit -m "Initial commit: Customer Success Pulse with Tenant Management System" || echo "⚠️  Zaten commit edilmiş dosyalar var, devam ediliyor..."

# GitHub repository URL'ini sor
echo ""
echo "📋 GitHub repository URL'ini girin (örn: https://github.com/username/customer-success-pulse.git)"
echo "   Veya boş bırakırsanız, GitHub CLI ile otomatik oluşturulacak."
read -p "Repository URL (boş bırakabilirsiniz): " REPO_URL

if [ -z "$REPO_URL" ]; then
    # GitHub CLI ile repository oluştur
    if command -v gh &> /dev/null; then
        echo "🔧 GitHub CLI ile repository oluşturuluyor..."
        gh repo create customer-success-pulse --public --source=. --remote=origin --push
        echo "✅ Repository oluşturuldu ve push edildi!"
    else
        echo "❌ GitHub CLI bulunamadı. Lütfen manuel olarak:"
        echo "   1. GitHub.com'da yeni repository oluşturun"
        echo "   2. Repository URL'ini bu script'e tekrar girin"
        exit 1
    fi
else
    # Remote ekle ve push et
    echo "🔗 Remote repository ekleniyor..."
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"
    
    # Branch'i main yap
    git branch -M main 2>/dev/null || true
    
    # Push et
    echo "⬆️  GitHub'a push ediliyor..."
    git push -u origin main
    
    echo "✅ Başarıyla GitHub'a push edildi!"
fi

echo ""
echo "🎉 Tamamlandı! Repository: https://github.com/$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\([^.]*\).*/\1/' || echo 'YOUR_USERNAME')/customer-success-pulse"

