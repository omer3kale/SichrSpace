#!/bin/bash

# Script to add favicon links to HTML files that don't have them

# Define the favicon HTML block
read -r -d '' FAVICON_BLOCK << 'EOF'
  <!-- Favicon and Icons -->
  <link rel="icon" href="img/favicon.ico" sizes="any">
  <link rel="icon" href="img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
  <link rel="icon" href="img/favicon-96x96.png" sizes="96x96" type="image/png">
  <link rel="icon" href="img/web-app-manifest-192x192.png" sizes="192x192" type="image/png">
  <link rel="icon" href="img/web-app-manifest-512x512.png" sizes="512x512" type="image/png">
EOF

# Key HTML files to update
declare -a HTML_FILES=(
    "apartments-listing.html"
    "chat.html"
    "chat-new.html"
    "create-account.html"
    "create-account-new.html"
    "login.html"
    "login-new.html"
    "landlord-dashboard.html"
    "applicant-dashboard.html"
    "admin-dashboard.html"
    "marketplace.html"
    "add-property.html"
    "viewing-request.html"
    "offer.html"
    "privacy-policy.html"
    "terms-of-service.html"
    "pwa-test.html"
)

cd "/Users/omer3kale/SichrPlace77/SichrPlace77/frontend"

echo "🔧 Adding favicon links to key HTML files..."

for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo "Processing: $file"
        
        # Check if the file already has favicon.ico link
        if ! grep -q "favicon.ico" "$file"; then
            # Find the line with <head> and add favicon block after it
            sed -i.bak '/<head>/a\
'"$FAVICON_BLOCK"'
' "$file"
            
            # Remove backup file
            rm -f "${file}.bak"
            echo "  ✅ Added favicon links to $file"
        else
            echo "  ℹ️  $file already has favicon links"
        fi
    else
        echo "  ⚠️  $file not found"
    fi
done

echo ""
echo "✅ Favicon integration complete!"
echo "🎯 Your SichrPlace favicon is now integrated across all key pages!"
echo ""
echo "📋 Summary:"
echo "   • Primary favicon: img/favicon.ico"
echo "   • Vector favicon: img/favicon.svg" 
echo "   • Apple touch icon: img/apple-touch-icon.png"
echo "   • PWA icons: 96px, 192px, 512px variants"
echo ""
echo "🌐 Your favicon will now appear in:"
echo "   • Browser tabs"
echo "   • Bookmarks"
echo "   • Home screen shortcuts"
echo "   • PWA installations"
