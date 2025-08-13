#!/bin/bash

# PWA Icon Generator for SichrPlace
# Generates PWA icons in various sizes from the existing logo

echo "🎨 Generating PWA icons for SichrPlace..."

# Check if ImageMagick is available
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install imagemagick
    else
        echo "❌ Please install ImageMagick manually: https://imagemagick.org/script/download.php"
        exit 1
    fi
fi

# Source logo file
LOGO_FILE="../img/logo-shield.svg"
if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ Logo file not found: $LOGO_FILE"
    exit 1
fi

# Icon sizes for PWA
SIZES=(72 96 128 144 152 192 384 512)

echo "📱 Generating PWA icons in multiple sizes..."

for size in "${SIZES[@]}"; do
    output_file="../img/pwa-icon-${size}.png"
    echo "   Creating ${size}x${size} icon: $output_file"
    
    # Convert SVG to PNG with the specified size
    convert -background none -size ${size}x${size} "$LOGO_FILE" "$output_file"
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Created: $output_file"
    else
        echo "   ❌ Failed to create: $output_file"
    fi
done

# Create favicon.ico from the 32x32 version
echo "🔗 Creating favicon.ico..."
convert -background none -size 32x32 "$LOGO_FILE" "../img/favicon.ico"

if [ $? -eq 0 ]; then
    echo "   ✅ Created: ../img/favicon.ico"
else
    echo "   ❌ Failed to create favicon.ico"
fi

# Create Apple touch icons
echo "🍎 Creating Apple touch icons..."
convert -background none -size 180x180 "$LOGO_FILE" "../img/apple-touch-icon.png"

if [ $? -eq 0 ]; then
    echo "   ✅ Created: ../img/apple-touch-icon.png"
else
    echo "   ❌ Failed to create Apple touch icon"
fi

echo ""
echo "🎉 PWA icon generation complete!"
echo ""
echo "Generated files:"
for size in "${SIZES[@]}"; do
    echo "   📱 img/pwa-icon-${size}.png"
done
echo "   🔗 img/favicon.ico"
echo "   🍎 img/apple-touch-icon.png"
echo ""
echo "💡 Add these to your HTML files:"
echo '<link rel="icon" href="img/favicon.ico">'
echo '<link rel="apple-touch-icon" href="img/apple-touch-icon.png">'
