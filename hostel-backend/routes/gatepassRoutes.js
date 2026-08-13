const express = require('express');
const router = express.Router();
const Gatepass = require('../models/Gatepass');

// CREATE a new gatepass
router.post('/', async (req, res) => {
  try {
    const newGatepass = new Gatepass(req.body);
    const savedGatepass = await newGatepass.save();
    res.status(201).json(savedGatepass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ALL gatepasses (Added this so Warden dashboard can fetch everything)
router.get('/', async (req, res) => {
  try {
    const gatepasses = await Gatepass.find().sort({ createdAt: -1 });
    res.status(200).json(gatepasses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET passes by studentId (For Student Dashboard)
router.get('/student/:studentId', async (req, res) => {
  try {
    const passes = await Gatepass.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.status(200).json(passes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET passes by hostelType and status (For Warden/Security)
router.get('/filter', async (req, res) => {
  try {
    const { hostelType, statuses } = req.query;
    const statusArray = statuses ? statuses.split(',') : [];
    
    const query = {};
    if (hostelType) query.hostelType = hostelType;
    if (statusArray.length > 0) query.status = { $in: statusArray };

    const passes = await Gatepass.find(query).sort({ createdAt: -1 });
    res.status(200).json(passes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE pass status (Supports both PUT and PATCH methods)
router.put('/:id', async (req, res) => {
  try {
    const updatedPass = await Gatepass.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true }
    );
    res.status(200).json(updatedPass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const updatedPass = await Gatepass.findByIdAndUpdate(
      req.params.id, 
      { $set: { status: req.body.status } }, 
      { new: true }
    );
    res.status(200).json(updatedPass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a pass (For Student cancelling before leaving)
router.delete('/:id', async (req, res) => {
  try {
    await Gatepass.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Gatepass deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;