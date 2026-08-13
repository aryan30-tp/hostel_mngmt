const express = require('express');
const router = express.Router();
const User = require('../models/User');

// CREATE or UPDATE user profile on registration
router.post('/', async (req, res) => {
  try {
    const { uid, email } = req.body;
    let user = await User.findOne({ uid });

    if (user) {
      // Update if already exists
      user = await User.findOneAndUpdate({ uid }, { $set: req.body }, { new: true });
      return res.status(200).json(user);
    }

    // Create new
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user profile by Firebase UID
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;