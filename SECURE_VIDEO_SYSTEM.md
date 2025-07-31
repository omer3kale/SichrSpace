# 🎬 SichrPlace Secure Video Management System

## Overview
This system provides secure video hosting for apartment viewing videos with comprehensive protection against unauthorized downloading and sharing.

## 🔒 Security Features

### Video Protection
- **No Download Option**: Videos cannot be downloaded by recipients
- **Token-Based Access**: Each video link requires a valid access token
- **Time-Limited Links**: Video links expire after 7 days for security
- **Secure Streaming**: Videos are streamed with range request support
- **Right-Click Protection**: Context menu disabled on video player
- **Developer Tools Protection**: F12 and other shortcuts disabled

### Access Control
- **Admin-Only Upload**: Only authenticated admins can upload videos
- **Unique Video IDs**: Each video gets a cryptographically secure unique ID
- **HMAC Signatures**: Access tokens use HMAC-SHA256 for verification
- **Secure File Storage**: Videos stored outside web root with random filenames

## 📁 System Architecture

### Backend Components
```
backend/
├── api/
│   └── secure-videos.js          # Video upload and streaming API
├── services/
│   └── emailService.js           # Updated with secure video emails
├── secure-videos/                # Secure video storage (auto-created)
└── app.js                        # Updated with video routes
```

### Frontend Components
```
frontend/
├── admin.html                    # Enhanced with video management
└── secure-viewer.html            # Secure video player for recipients
```

## 🚀 How It Works

### 1. Video Upload Process
1. Admin uploads video through admin dashboard
2. System generates secure filename and unique video ID
3. Video metadata stored in memory (production: use database)
4. Upload progress tracked with real-time feedback

### 2. Email Integration
1. Admin selects video from dropdown in email form
2. System generates secure viewer link with 7-day expiration
3. Email sent with protected video link
4. Recipient gets professional email with viewing instructions

### 3. Secure Video Viewing
1. Recipient clicks link in email
2. Secure viewer page validates access token
3. Video streams with download protection enabled
4. Access expires after 7 days automatically

## 🔧 Configuration

### Environment Variables
```bash
# Required for video encryption
VIDEO_SECRET=your-secret-key-here

# Gmail configuration (already set up)
GMAIL_USER=sichrplace@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### File Permissions
- Ensure `secure-videos/` directory has proper read/write permissions
- Videos should not be accessible via direct web URL

## 📧 Email Flow Integration

### Email #1: Request Confirmation ✅
- **Trigger**: Automatic when viewing request submitted
- **Content**: "We've received your request"
- **Status**: Already implemented

### Email #2: Viewing Confirmation ✅
- **Trigger**: Manual when viewer assigned
- **Content**: Viewer details + payment link
- **Status**: Already implemented

### Email #3: Viewing Results 🎬 NEW!
- **Trigger**: Manual when video uploaded
- **Content**: Secure video link + viewing notes
- **Security**: Protected video player, 7-day expiration
- **Status**: Newly implemented

## 🎯 Admin Dashboard Features

### Video Management Section
- **📹 Video Upload**: Drag & drop with progress tracking
- **📚 Video Library**: Search and manage all uploaded videos
- **🎬 Preview Player**: Secure preview for admins
- **📧 Quick Email**: One-click email sending with video
- **🗑️ Video Deletion**: Secure removal with confirmation

### Email Management Integration
- **Video Selection**: Dropdown with available videos
- **Auto-Fill**: Click video to pre-fill email form
- **Security Notice**: Clear indication of protection level
- **Progress Tracking**: Real-time email sending status

## 🛡️ Security Measures

### Video File Protection
```javascript
// Videos served with security headers
res.set({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'"
});
```

### Client-Side Protection
```javascript
// Disable right-click, F12, text selection, drag & drop
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.keyCode === 123) e.preventDefault(); // F12
});
```

### Token Verification
```javascript
// HMAC-based token with timestamp validation
const signature = crypto.createHmac('sha256', VIDEO_SECRET)
  .update(`${videoId}:${timestamp}`)
  .digest('hex');
```

## 📊 Usage Analytics (Optional)

### Video Access Tracking
- View count per video
- Watch time analytics
- Access patterns
- Security breach detection

## 🔄 Backup & Recovery

### Recommendations
1. **Regular Backups**: Backup secure-videos directory
2. **Metadata Export**: Export video metadata regularly
3. **Access Logs**: Monitor video access patterns
4. **Storage Scaling**: Plan for video storage growth

## 🎯 Production Considerations

### Database Integration
```javascript
// Replace in-memory storage with database
const VideoModel = require('./models/Video');
const videos = await VideoModel.find();
```

### CDN Integration
```javascript
// For scale, consider secure CDN
const cdnUrl = generateSecureCDNUrl(videoId, token);
```

### Monitoring
- Video access logs
- Failed authentication attempts
- Storage usage alerts
- Email delivery tracking

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install multer cors
   ```

2. **Set Environment Variables**:
   ```bash
   echo "VIDEO_SECRET=your-secure-random-key" >> .env
   ```

3. **Start Server**:
   ```bash
   npm start
   ```

4. **Access Admin Dashboard**:
   - Navigate to `/admin.html`
   - Go to "Video Management" section
   - Upload your first secure video!

## 🎬 Demo Workflow

1. **Admin uploads apartment video** → Secure storage + unique ID
2. **Admin selects video in email form** → Auto-fills recipient details
3. **System generates secure link** → 7-day expiration token
4. **Email sent with video link** → Professional email template
5. **Recipient clicks link** → Secure viewer with download protection
6. **Video streams securely** → No download option, expires automatically

---

**🏡 SichrPlace Secure Video System** - Making apartment viewing videos secure, professional, and user-friendly!
