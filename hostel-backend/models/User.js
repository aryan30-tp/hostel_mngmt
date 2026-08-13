const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID link
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  role: { type: String, enum: ['student', 'warden', 'staff'], required: true },
  hostelType: { type: String, enum: ['Boys', 'Girls', 'All'], default: 'Boys' },
  staffCategory: { type: String }, // For staff members (Security, Cleaning, etc.)
  roomNo: { type: String },
  rollNo: { type: String },
  course: { type: String },
  parentMobile: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);