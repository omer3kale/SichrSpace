#!/bin/bash

# Script to add comprehensive favicon links to all HTML files in SichrPlace

# Define the favicon HTML block
FAVICON_BLOCK='  <!-- Favicon and Icons -->
  <link rel="icon" href="img/favicon.ico" sizes="any">
  <link rel="icon" href="img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
  <link rel="icon" href="img/favicon-96x96.png" sizes="96x96" type="image/png">
  <link rel="icon" href="img/web-app-manifest-192x192.png" sizes="192x192" type="image/png">
  <link rel="icon" href="img/web-app-manifest-512x512.png" sizes="512x512" type="image/png">'

# Directory containing HTML files
HTML_DIR="/Users/omer3kale/SichrPlace77/SichrPlace77/frontend"

echo "🔧 Adding favicon links to all HTML files..."

# Find all HTML files and process them
find "$HTML_DIR" -name "*.html" -type f | while read -r file; do
    echo "Processing: $(basename "$file")"
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Flag to track if we've added the favicon block
    added_favicon=false
    
    # Process the file line by line
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        
        # Check if this is the head tag and we haven't added favicon yet
        if [[ "$line" == *"<head>"* ]] && [ "$added_favicon" = false ]; then
            echo "$FAVICON_BLOCK" >> "$temp_file"
            added_favicon=true
        fi
        
    done < "$file"
    
    # Replace the original file with the updated one
    mv "$temp_file" "$file"
    
done

echo "✅ Favicon links added to all HTML files!"
echo "📱 Your SichrPlace favicon will now appear on all pages!"
