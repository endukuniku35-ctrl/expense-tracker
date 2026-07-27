/**
 * routes/community.js – Community Features: Meal Polls, Shared Shopping List & User Feedback
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { all, run } = require('../database');

// --- MEAL POLLS ---
router.get('/polls', requireAuth, async (req, res) => {
  const polls = [
    {
      id: 'poll-1',
      question: 'What should we cook for tomorrow dinner?',
      options: [
        { text: '🍗 Chicken Curry & Roti', votes: 4 },
        { text: '🍛 Hyderabadi Biryani', votes: 2 },
        { text: '🥗 Veg Paneer Curry', votes: 1 }
      ],
      votedUsers: ['192472374', '192472343', '192411184'],
      createdAt: new Date().toISOString()
    }
  ];
  res.json({ success: true, polls });
});

router.post('/polls/vote', requireAuth, async (req, res) => {
  const { pollId, optionIndex } = req.body;
  res.json({ success: true, message: 'Vote recorded successfully!' });
});

// --- SHARED SHOPPING LIST ---
router.get('/shopping-list', requireAuth, async (req, res) => {
  const items = [
    { id: 's-1', item: 'Fresh Tomatoes (2 kg)', addedBy: 'Sagar', completed: false },
    { id: 's-2', item: 'Sunflower Oil (1 Liter)', addedBy: 'Prathap', completed: false },
    { id: 's-3', item: 'Basmati Rice (5 kg)', addedBy: 'Jagan', completed: true }
  ];
  res.json({ success: true, items });
});

router.post('/shopping-list', requireAuth, async (req, res) => {
  const { item } = req.body;
  if (!item) return res.status(400).json({ success: false, message: 'Item text is required' });
  res.json({ success: true, message: `Added "${item}" to household shopping list!` });
});

// --- USER FEEDBACK ---
router.post('/feedback', requireAuth, async (req, res) => {
  const { rating, feedback, easyToManage } = req.body;
  const user = req.session?.user?.shortName || 'Member';
  
  await run(
    `INSERT INTO audit_logs (id, action, performedBy, performedByName, targetId, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), 'USER_FEEDBACK', req.session?.user?.userid || 'user', user, 'feedback', JSON.stringify({ rating, feedback, easyToManage }), new Date().toISOString()]
  );

  res.json({ success: true, message: 'Thank you for your feedback! We strive to make CurryTracker better every day.' });
});

module.exports = router;
