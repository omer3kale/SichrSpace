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
