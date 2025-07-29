const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();

// --- Apartment Offer Schema ---
const apartmentOfferSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  postalCode: { type: String, required: true },
  price: { type: Number, required: true },
  moveInDate: { type: Date, required: true },
  moveOutDate: { type: Date },
  numberOfRooms: { type: Number, required: true },
  deposit: { type: Number, required: true },
  images: [String],
  createdAt: { type: Date, default: Date.now }
});

const ApartmentOffer = mongoose.models.ApartmentOffer || mongoose.model('ApartmentOffer', apartmentOfferSchema);

// --- Multer Storage Setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
});

// --- POST /upload-apartment ---
router.post('/', upload.array('apartment-images', 10), async (req, res) => {
  try {
    // Extract form fields
    const {
      'apartment-title': title,
      'apartment-description': description,
      'apartment-address': address,
      'apartment-postal-code': postalCode,
      'apartment-price': price,
      'move-in-date': moveInDate,
      'move-out-date': moveOutDate,
      'number-of-rooms': numberOfRooms,
      'deposit-required': deposit
    } = req.body;

    // Validate required fields
    if (!title || !description || !address || !postalCode || !price || !moveInDate || !numberOfRooms || !deposit) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Handle images
    const images = req.files ? req.files.map(file => file.filename) : [];

    // Create and save the offer
    const offer = new ApartmentOffer({
      title,
      description,
      address,
      postalCode,
      price: Number(price),
      moveInDate: new Date(moveInDate),
      moveOutDate: moveOutDate ? new Date(moveOutDate) : null,
      numberOfRooms: Number(numberOfRooms),
      deposit: Number(deposit),
      images
    });

    await offer.save();

    res.status(200).json({ success: true, message: 'Apartment offer uploaded!', offerId: offer._id });
  } catch (err) {
    console.error('Error uploading apartment offer:', err);
    res.status(500).json({ error: 'Failed to upload apartment offer.' });
  }
});

module.exports = router;