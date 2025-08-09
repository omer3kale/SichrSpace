const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  feedback: { type: String, required: true },
  session: { type: Array, default: [] },
  time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
