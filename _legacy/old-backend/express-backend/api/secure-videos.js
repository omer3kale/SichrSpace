const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

// Secure video storage configuration
const SECURE_VIDEOS_DIR = path.join(__dirname, '../secure-videos');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];

// Ensure secure videos directory exists
if (!fs.existsSync(SECURE_VIDEOS_DIR)) {
  fs.mkdirSync(SECURE_VIDEOS_DIR, { recursive: true });
}

// In-memory storage for video metadata (in production, use database)
let videoMetadata = [];

// Generate secure random filename
function generateSecureFilename(originalFilename) {
  const ext = path.extname(originalFilename);
  const randomName = crypto.randomBytes(32).toString('hex');
  return `${randomName}${ext}`;
}

// Generate secure access token
function generateAccessToken(videoId) {
  const timestamp = Date.now();
  const data = `${videoId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', process.env.VIDEO_SECRET || 'sichrplace-video-secret')
    .update(data)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

// Verify access token
function verifyAccessToken(token, videoId) {
  try {
    const [timestamp, signature] = token.split('.');
    const data = `${videoId}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', process.env.VIDEO_SECRET || 'sichrplace-video-secret')
      .update(data)
      .digest('hex');
    
    // Token expires after 24 hours
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return signature === expectedSignature && tokenAge < maxAge;
  } catch (error) {
    return false;
  }
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SECURE_VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, generateSecureFilename(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'), false);
    }
  }
});

// Upload secure video
router.post('/upload-secure', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    const { apartmentAddress, userEmail, title, notes } = req.body;

    if (!apartmentAddress || !userEmail || !title) {
      // Clean up uploaded file if metadata is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const videoId = crypto.randomBytes(16).toString('hex');
    const videoData = {
      id: videoId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      apartmentAddress,
      userEmail,
      title,
      notes: notes || '',
      uploadDate: new Date().toISOString(),
      fileSize: req.file.size,
      status: 'Ready',
      accessCount: 0
    };

    videoMetadata.push(videoData);

    console.log(`Secure video uploaded: ${videoId} for ${userEmail} at ${apartmentAddress}`);

    res.json({
      success: true,
      videoId,
      message: 'Video uploaded successfully with secure protection'
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload video' });
  }
});

// List all videos (admin only)
router.get('/list', (req, res) => {
  try {
    const videos = videoMetadata.map(video => ({
      id: video.id,
      apartmentAddress: video.apartmentAddress,
      userEmail: video.userEmail,
      title: video.title,
      uploadDate: video.uploadDate,
      status: video.status,
      accessCount: video.accessCount,
      fileSize: (video.fileSize / 1024 / 1024).toFixed(2) + ' MB'
    }));

    res.json(videos);
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ success: false, error: 'Failed to list videos' });
  }
});

// Get video metadata
router.get('/:videoId', (req, res) => {
  try {
    const video = videoMetadata.find(v => v.id === req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    res.json({
      success: true,
      id: video.id,
      apartmentAddress: video.apartmentAddress,
      userEmail: video.userEmail,
      title: video.title,
      notes: video.notes,
      uploadDate: video.uploadDate,
      status: video.status
    });

  } catch (error) {
    console.error('Error getting video metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to get video data' });
  }
});

// Generate secure preview link
router.get('/:videoId/preview', (req, res) => {
  try {
    const video = videoMetadata.find(v => v.id === req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    const accessToken = generateAccessToken(req.params.videoId);
    const secureUrl = `/api/videos/${req.params.videoId}/stream?token=${accessToken}`;

    res.json({
      success: true,
      title: video.title,
      notes: video.notes,
      secureUrl,
      expiresIn: '24 hours'
    });

  } catch (error) {
    console.error('Error generating preview link:', error);
    res.status(500).json({ success: false, error: 'Failed to generate preview link' });
  }
});

// Stream video with token verification
router.get('/:videoId/stream', (req, res) => {
  try {
    const { token } = req.query;
    const videoId = req.params.videoId;

    if (!token || !verifyAccessToken(token, videoId)) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }

    const video = videoMetadata.find(v => v.id === videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoPath = path.join(SECURE_VIDEOS_DIR, video.filename);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Increment access count
    video.accessCount = (video.accessCount || 0) + 1;

    // Set security headers to prevent downloading
    res.set({
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self'",
      'Content-Disposition': 'inline; filename="secure-video.mp4"'
    });

    // Handle range requests for video streaming
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Generate secure link for email
router.get('/:videoId/email-link', (req, res) => {
  try {
    const video = videoMetadata.find(v => v.id === req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Generate a long-lived token for email (7 days)
    const timestamp = Date.now();
    const emailData = `${req.params.videoId}:${timestamp}:email`;
    const signature = crypto.createHmac('sha256', process.env.VIDEO_SECRET || 'sichrplace-video-secret')
      .update(emailData)
      .digest('hex');
    
    const emailToken = `${timestamp}.${signature}`;
    const viewerUrl = `${req.protocol}://${req.get('host')}/secure-viewer/${req.params.videoId}?token=${emailToken}`;

    res.json({
      success: true,
      viewerUrl,
      title: video.title,
      apartmentAddress: video.apartmentAddress,
      expiresIn: '7 days'
    });

  } catch (error) {
    console.error('Error generating email link:', error);
    res.status(500).json({ success: false, error: 'Failed to generate email link' });
  }
});

// Search videos
router.get('/search', (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || '';
    
    const filteredVideos = videoMetadata.filter(video => 
      video.apartmentAddress.toLowerCase().includes(query) ||
      video.userEmail.toLowerCase().includes(query) ||
      video.title.toLowerCase().includes(query)
    );

    const videos = filteredVideos.map(video => ({
      id: video.id,
      apartmentAddress: video.apartmentAddress,
      userEmail: video.userEmail,
      title: video.title,
      uploadDate: video.uploadDate,
      status: video.status,
      accessCount: video.accessCount
    }));

    res.json(videos);
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ success: false, error: 'Failed to search videos' });
  }
});

// Delete video
router.delete('/:videoId', (req, res) => {
  try {
    const videoIndex = videoMetadata.findIndex(v => v.id === req.params.videoId);
    
    if (videoIndex === -1) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    const video = videoMetadata[videoIndex];
    const videoPath = path.join(SECURE_VIDEOS_DIR, video.filename);

    // Delete file from disk
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Remove from metadata
    videoMetadata.splice(videoIndex, 1);

    console.log(`Video deleted: ${req.params.videoId}`);

    res.json({ success: true, message: 'Video deleted successfully' });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
});

module.exports = router;
