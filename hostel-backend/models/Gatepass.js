const mongoose = require('mongoose');

const GatepassSchema = new mongoose.Schema({
  studentId: { type: String, required: true }, // Firebase UID
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  roomNo: { type: String, required: true },
  course: { type: String, required: true },
  mobile: { type: String, required: true },
  parentMobile: { type: String, required: true },
  destination: { type: String, required: true },
  reason: { type: String, required: true },
  hostelType: { type: String, required: true },
  
  type: { type: String, enum: ['normal', 'pre-approval', 'emergency'], default: 'normal' },
  status: { type: String, enum: ['pending', 'approved', 'declined', 'out', 'in', 'emergency'], default: 'pending' },
  
  expectedOut: { type: String },
  expectedIn: { type: String },
  outTime: { type: Date },
  inTime: { type: Date },
  duration: { type: String },
  
  targetDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gatepass', GatepassSchema);