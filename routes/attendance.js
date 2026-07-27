/**
 * routes/attendance.js – Daily Meal Attendance Sheet (Breakfast, Lunch, Dinner)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMembers } = require('./balance');
const { all, run } = require('../database');

// GET /api/attendance - Get meal attendance matrix for date
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const members = await getMembers(req.session?.user);
    const attendanceRecords = await all('SELECT * FROM attendance');
    
    const dayRecords = (attendanceRecords || []).filter(r => r.date === date);

    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const matrix = {};

    mealTypes.forEach(meal => {
      const rec = dayRecords.find(r => r.mealType === meal);
      const attendees = rec ? (Array.isArray(rec.attendees) ? rec.attendees : JSON.parse(rec.attendees || '[]')) : members.map(m => m.userid);
      matrix[meal] = attendees;
    });

    res.json({
      success: true,
      date,
      members,
      attendance: matrix
    });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance - Mark attendance for date & meal
router.post('/', requireAuth, async (req, res) => {
  const { date, mealType, attendees } = req.body;
  if (!date || !mealType || !Array.isArray(attendees)) {
    return res.status(400).json({ success: false, message: 'Date, Meal Type, and Attendees array are required' });
  }

  try {
    await run(
      `INSERT INTO attendance (date, mealType, attendees) VALUES (?, ?, ?)`,
      [date, mealType, JSON.stringify(attendees)]
    );

    res.json({ success: true, message: `Attendance for ${mealType.toUpperCase()} on ${date} saved!` });
  } catch (err) {
    console.error('Error saving attendance:', err);
    res.status(500).json({ success: false, message: 'Failed to save attendance' });
  }
});

module.exports = router;
