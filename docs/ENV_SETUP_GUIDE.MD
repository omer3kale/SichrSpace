# ðŸŒŸ **ENVIRONMENT SETUP GUIDE**
## Essential Configuration for SichrPlace Production

Your database schema deployment was successful! Now let's configure the essential environment variables to make all features work.

## ðŸ”‘ **REQUIRED ENVIRONMENT VARIABLES**

### 1. **Supabase Configuration (CRITICAL)**
```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to get these:**
1. Go to your Supabase dashboard
2. Click on your project
3. Go to Settings â†’ API
4. Copy the URL and anon key
5. Copy the service_role key (keep this secret!)

### 2. **Slack Error Notifications (HIGH PRIORITY)**
```bash
SLACK_ERROR_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**How to set this up:**
1. Go to your Slack workspace
2. Create a new webhook: https://api.slack.com/messaging/webhooks
3. Choose a channel (e.g., #alerts or #errors)
4. Copy the webhook URL

### 3. **UptimeRobot Monitoring (RECOMMENDED)**
```bash
UPTIMEROBOT_API_KEY=your-uptimerobot-api-key
```

**How to get this:**
1. Sign up at https://uptimerobot.com
2. Go to Settings â†’ API Settings
3. Create a new API key
4. Copy the key

### 4. **Authentication Secrets (CRITICAL)**
```bash
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
```

**Generate a secure JWT secret:**
```bash
# In PowerShell:
[System.Web.Security.Membership]::GeneratePassword(32, 0)

# Or use this online generator:
# https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

## ðŸš€ **SETTING UP ENVIRONMENT VARIABLES**

### **For Netlify (Production):**
1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings â†’ Environment variables
4. Add each variable listed above

### **For Local Development:**
Create a `.env` file in your root directory:

```bash
# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters

# Slack Notifications
SLACK_ERROR_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# UptimeRobot
UPTIMEROBOT_API_KEY=your-uptimerobot-api-key
```

## âœ… **VERIFICATION STEPS**

### 1. Test Database Connection
```bash
# Navigate to your site and check:
# https://your-site.netlify.app/api/health
```

### 2. Test User Feedback System
```bash
# Navigate to:
# https://your-site.netlify.app/api/feedback
# Should show: "Method not allowed" (good - means it's working)
```

### 3. Test Error Tracking
```bash
# Navigate to:
# https://your-site.netlify.app/api/simple-error-tracking
# Check your Slack channel for notifications
```

## ðŸŽ¯ **NEXT ACTION ITEMS**

1. **Configure environment variables** (above)
2. **Run UptimeRobot setup script**: `bash scripts/setup-uptimerobot.sh`
3. **Deploy frontend changes** (feedback widget + lazy loading)
4. **Test all systems** end-to-end

## ðŸ†˜ **TROUBLESHOOTING**

### Common Issues:
- **"Missing environment variables"**: Check Netlify dashboard environment variables
- **"Supabase connection failed"**: Verify URL and keys are correct
- **"Slack notifications not working"**: Test webhook URL manually
- **"JWT errors"**: Ensure JWT_SECRET is at least 32 characters

### Support:
If you encounter issues, check:
1. Netlify function logs
2. Supabase dashboard logs
3. Browser developer console

---

**ðŸŽ‰ Once configured, your SichrPlace platform will have:**
- âœ… Real-time error tracking with Slack alerts
- âœ… User feedback collection system  
- âœ… External uptime monitoring
- âœ… Optimized performance with lazy loading
- âœ… Automated database backups
- âœ… SEO validation automation

**Ready for production! ðŸš€**