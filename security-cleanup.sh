#!/bin/bash

# Security Cleanup Script
# Removes hardcoded API keys and sensitive data from documentation and config files

echo "🔐 Security Cleanup: Removing hardcoded credentials..."

# Function to replace API keys in files with placeholders
replace_api_keys() {
    local file="$1"
    if [ -f "$file" ]; then
        # Replace Google Maps API keys
        sed -i.backup 's/AIzaSyDJxwKPd6TFySRiJf5PeTPVbszFwT0NChE/your-google-maps-api-key-here/g' "$file"
        
        # Replace Supabase access tokens
        sed -i.backup 's/sbp_f91cc66cfa13770757e3f8d29cdc5da2c3212167/your-supabase-access-token-here/g' "$file"
        
        # Replace JWT tokens (keeping first 20 chars as example format)
        sed -i.backup 's/eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/eyJhbGciOiJIUzI1NiIsInR5cC...your-jwt-token-here/g' "$file"
        
        # Remove backup file
        rm -f "$file.backup"
        echo "✅ Cleaned: $file"
    fi
}

# Clean documentation files
for file in *.md **/*.md; do
    if [ -f "$file" ]; then
        replace_api_keys "$file"
    fi
done

# Clean CI/CD configuration files
for file in .github/**/*.yml .github/**/*.md; do
    if [ -f "$file" ]; then
        replace_api_keys "$file"
    fi
done

# Clean shell scripts (except this one)
for file in *.sh; do
    if [ -f "$file" ] && [ "$file" != "security-cleanup.sh" ]; then
        replace_api_keys "$file"
    fi
done

echo "🔐 Security cleanup completed!"
echo "⚠️  Please review the changes and update environment variables accordingly."
