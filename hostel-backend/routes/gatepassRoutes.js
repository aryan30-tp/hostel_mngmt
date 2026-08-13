const express = require('express');
const router = express.Router();
const Gatepass = require('../models/Gatepass');

// CREATE a new gatepass
router.post('/', async (req, res) => {
  try {
    const newGatepass = new Gatepass(req.body);
    const savedGatepass = await newGatepass.save();
    
    // Emit real-time update
    req.app.get('io').emit('gatepassUpdate');
    
    res.status(201).json(savedGatepass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ALL gatepasses
router.get('/', async (req, res) => {
  try {
    const gatepasses = await Gatepass.find().sort({ createdAt: -1 });
    res.status(200).json(gatepasses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET passes by studentId
router.get('/student/:studentId', async (req, res) => {
  try {
    const passes = await Gatepass.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.status(200).json(passes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET passes by hostelType and status
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

// UPDATE pass status (PUT)
router.put('/:id', async (req, res) => {
  try {
    const updatedPass = await Gatepass.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true }
    );
    
    // Emit real-time update (Alerts Security Guard instantly)
    req.app.get('io').emit('gatepassUpdate');
    
    res.status(200).json(updatedPass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE pass status (PATCH)
router.patch('/:id/status', async (req, res) => {
  try {
    const updatedPass = await Gatepass.findByIdAndUpdate(
      req.params.id, 
      { $set: { status: req.body.status } }, 
      { new: true }
    );
    
    // Emit real-time update
    req.app.get('io').emit('gatepassUpdate');
    
    res.status(200).json(updatedPass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a pass
router.delete('/:id', async (req, res) => {
  try {
    await Gatepass.findByIdAndDelete(req.params.id);
    
    req.app.get('io').emit('gatepassUpdate');
    
    res.status(200).json({ message: "Gatepass deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;