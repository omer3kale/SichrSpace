#!/bin/bash

# Script to update all HTML files with new shield logo

echo "🔄 Updating all HTML files with new shield logo..."

# Find all HTML files and update logo references
find frontend/ -name "*.html" -type f -exec sed -i '' 's/img\/logo\.jpg/img\/logo-shield.svg/g' {} \;

# Update favicon references
find frontend/ -name "*.html" -type f -exec sed -i '' 's/type="image\/jpeg"/type="image\/svg+xml"/g' {} \;
find frontend/ -name "*.html" -type f -exec sed -i '' 's/type="image\/png"/type="image\/svg+xml"/g' {} \;

# Update og:image references
find frontend/ -name "*.html" -type f -exec sed -i '' 's/https:\/\/sichrplace\.com\/img\/logo\.jpg/https:\/\/sichrplace.com\/img\/logo-shield.svg/g' {} \;

# Add height styling to logo images where missing
find frontend/ -name "*.html" -type f -exec sed -i '' 's/<img src="img\/logo-shield\.svg" alt="SichrPlace Logo">/<img src="img\/logo-shield.svg" alt="SichrPlace Logo" style="height: 40px;">/g' {} \;

# Remove border-radius from shield logos (not needed for SVG)
find frontend/ -name "*.html" -type f -exec sed -i '' 's/border-radius: [^;"]*[;"]/"/g' {} \;

echo "✅ Logo update complete!"
echo "📁 Updated files: $(find frontend/ -name "*.html" | wc -l) HTML files"
echo "🎨 New logo: img/logo-shield.svg (Blue shield with magnifying glass)"
