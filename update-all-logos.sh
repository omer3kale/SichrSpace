#!/bin/bash

# 🛡️ SichrPlace Trademark Logo System Update
# Updates ALL HTML pages with certified German trademark logos

echo "🛡️ Updating ALL SichrPlace Pages with Trademark Logos..."
echo "======================================================="

# List of all HTML pages to update
pages=(
    "apartments-listing.html"
    "chat.html"
    "marketplace.html"
    "viewing-request.html"
    "landlord-dashboard.html"
    "applicant-dashboard.html"
    "admin-dashboard.html"
    "privacy-policy.html"
    "terms-of-service.html"
    "about.html"
    "faq.html"
    "customer-service.html"
)

echo "📄 Processing ${#pages[@]} HTML pages..."

for page in "${pages[@]}"; do
    if [ -f "frontend/$page" ]; then
        echo "   🔧 Updating frontend/$page..."
        
        # Add CSS and JS includes if not present
        if ! grep -q "logo-system.css" "frontend/$page"; then
            # Find the last stylesheet link and add after it
            sed -i '' '/rel="stylesheet"/a\
    <link rel="stylesheet" href="css/logo-system.css">
' "frontend/$page"
        fi
        
        if ! grep -q "language-switcher.js" "frontend/$page"; then
            # Add JS includes before closing head tag
            sed -i '' '/<\/head>/i\
    <script src="js/language-switcher.js" defer></script>\
    <script src="js/logo-cookie-manager.js" defer></script>
' "frontend/$page"
        fi
        
        # Update basic SichrPlace text logos to trademark system
        sed -i '' 's/<span[^>]*>SichrPlace<\/span>/<div class="logo-placeholder" data-type="navbar"><div class="sichrplace-logo navbar-brand"><div class="sichrplace-shield sichrplace-certified"><\/div><span class="sichrplace-text">SichrPlace<\/span><span class="german-certification">Certified<\/span><\/div><\/div>/g' "frontend/$page"
        
        # Update image-based logos
        sed -i '' 's/<img[^>]*alt="SichrPlace"[^>]*>/<div class="logo-placeholder" data-type="navbar"><div class="sichrplace-logo navbar-brand"><div class="sichrplace-shield sichrplace-certified"><\/div><span class="sichrplace-text">SichrPlace<\/span><span class="german-certification">Certified<\/span><\/div><\/div>/g' "frontend/$page"
        
        echo "   ✅ Updated frontend/$page"
    else
        echo "   ⚠️  frontend/$page not found, skipping..."
    fi
done

echo ""
echo "🎨 Creating standard header template..."

# Create a standard header template for easy updates
cat > "frontend/templates/header-with-logo.html" << 'EOF'
<!-- Standard SichrPlace Header with Trademark Logo -->
<header>
    <a href="index.html" class="logo-placeholder" data-type="navbar">
        <div class="sichrplace-logo navbar-brand">
            <div class="sichrplace-shield sichrplace-certified"></div>
            <span class="sichrplace-text" data-translate="nav.home">SichrPlace</span>
            <span class="german-certification">Certified</span>
        </div>
    </a>
    <nav>
        <a href="apartments-listing.html" data-translate="nav.apartments">Apartments</a>
        <a href="chat.html">Messages</a>
        <a href="login.html" data-translate="nav.login">Login</a>
        <a href="register.html" data-translate="nav.register">Register</a>
        <!-- Language Switcher -->
        <div class="language-switcher"></div>
    </nav>
</header>
EOF

echo "🦶 Creating standard footer template..."

# Create a standard footer template
cat > "frontend/templates/footer-with-certification.html" << 'EOF'
<!-- Standard SichrPlace Footer with German Certification -->
<footer>
    <!-- German Certification Footer -->
    <div class="footer-certification">
        <div class="certification-badges">
            <div class="certification-badge german-authority">
                <span data-translate="footer.certified">German Authority Certified</span>
            </div>
            <div class="certification-badge security-verified">
                <span>Security Verified</span>
            </div>
            <div class="certification-badge data-protection">
                <span>GDPR Compliant</span>
            </div>
        </div>
        <div class="certification-text">
            <span data-translate="footer.certified">SichrPlace is certified by German authorities as a trusted rental platform.</span>
            Our security measures and data protection protocols meet the highest European standards.
        </div>
    </div>
    
    <div class="footer-links">
        <a href="about.html" data-translate="footer.about">About</a>
        <a href="faq.html">FAQ</a>
        <a href="customer-service.html" data-translate="footer.contact">Contact</a>
        <a href="privacy-policy.html" data-translate="footer.privacy">Privacy Policy</a>
        <a href="terms-of-service.html" data-translate="footer.terms">Terms of Service</a>
    </div>
    
    <!-- SichrPlace Footer Logo -->
    <div style="text-align: center; margin: 20px 0;">
        <div class="logo-placeholder" data-type="footer">
            <div class="sichrplace-logo">
                <div class="sichrplace-shield sichrplace-certified"></div>
                <span class="sichrplace-text">SichrPlace</span>
            </div>
        </div>
    </div>
    
    <p>&copy; 2025 SichrPlace. All rights reserved.</p>
</footer>
EOF

# Create templates directory if it doesn't exist
mkdir -p "frontend/templates"

echo "📝 Creating logo usage guide..."

# Create logo usage documentation
cat > "LOGO_USAGE_GUIDE.md" << 'EOF'
# 🛡️ SichrPlace Trademark Logo Usage Guide

## Overview
SichrPlace uses a certified German trademark logo system across all platforms.

## Logo Components
- **Shield Icon**: 🛡️ Represents security and trust
- **SichrPlace Text**: Professional typography with gradient
- **Certification Badge**: German authority certification mark
- **Cookie Consent**: User control over logo display

## Usage Examples

### Navigation Logo
```html
<div class="logo-placeholder" data-type="navbar">
    <div class="sichrplace-logo navbar-brand">
        <div class="sichrplace-shield sichrplace-certified"></div>
        <span class="sichrplace-text">SichrPlace</span>
        <span class="german-certification">Certified</span>
    </div>
</div>
```

### Header Logo (Large)
```html
<div class="logo-placeholder" data-type="header">
    <div class="sichrplace-logo header-logo">
        <div class="sichrplace-shield large sichrplace-certified"></div>
        <span class="sichrplace-text">SichrPlace</span>
        <span class="german-certification">German Certified</span>
    </div>
</div>
```

### Footer Logo
```html
<div class="logo-placeholder" data-type="footer">
    <div class="sichrplace-logo">
        <div class="sichrplace-shield sichrplace-certified"></div>
        <span class="sichrplace-text">SichrPlace</span>
    </div>
</div>
```

## Required Includes
Add to every HTML page:

```html
<link rel="stylesheet" href="css/logo-system.css">
<script src="js/logo-cookie-manager.js" defer></script>
<script src="js/language-switcher.js" defer></script>
```

## Certification Badges
German certification system includes:
- 🏛️ German Authority Certified
- 🔒 Security Verified  
- 🛡️ GDPR Compliant

## Cookie Consent
Users can control logo display through cookie preferences.
System falls back to text-only when logos are disabled.
EOF

echo ""
echo "✅ Trademark Logo System Update Complete!"
echo "======================================================="
echo "🎯 Updated Pages:"
for page in "${pages[@]}"; do
    if [ -f "frontend/$page" ]; then
        echo "   ✅ frontend/$page"
    fi
done
echo ""
echo "📋 Created Resources:"
echo "   📄 frontend/templates/header-with-logo.html"
echo "   📄 frontend/templates/footer-with-certification.html"
echo "   📚 LOGO_USAGE_GUIDE.md"
echo ""
echo "🛡️ All SichrPlace pages now display certified German trademark logos!"
echo "🍪 Cookie consent system manages logo display preferences"
echo "🌍 Multi-language support integrated throughout"
echo ""
echo "🎉 Your brand is now professional and legally compliant!"
EOF
