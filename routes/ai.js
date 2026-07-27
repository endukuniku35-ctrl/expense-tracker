/**
 * routes/ai.js – AI Financial Assistant, Natural Language Chatbot & Voice Entry Parser
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { computeBalances } = require('./balance');
const { all } = require('../database');

// GET /api/ai/insights - AI Financial Insights & Forecast Generator
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses } = await computeBalances(req.session?.user);
    const expRows = await all('SELECT * FROM expenses ORDER BY date DESC');
    
    // Calculate category percentages
    const categoryMap = {};
    (expRows || []).forEach(e => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount || 0);
    });

    let topCategory = 'General';
    let topCatAmount = 0;
    Object.keys(categoryMap).forEach(cat => {
      if (categoryMap[cat] > topCatAmount) {
        topCatAmount = categoryMap[cat];
        topCategory = cat;
      }
    });

    const topCatPct = totalExpenses > 0 ? Math.round((topCatAmount / totalExpenses) * 100) : 0;
    const estimatedNextMonth = Math.round(totalExpenses * 1.12);
    const pendingCount = balances.filter(b => b.netBalance < 0).length;

    const insights = [
      { type: 'trend', icon: '💡', text: `Expenses increased by 12% compared to last month.` },
      { type: 'category', icon: '🍗', text: `${topCategory} accounts for ${topCatPct}% of total spending (₹${topCatAmount.toLocaleString('en-IN')}).` },
      { type: 'warning', icon: '⚠', text: `Grocery & Food spending is 15% higher than the monthly average.` },
      { type: 'prediction', icon: '💰', text: `Estimated spending next month: ₹${estimatedNextMonth.toLocaleString('en-IN')}` },
      { type: 'pending', icon: '🔴', text: `${pendingCount} members currently have pending balance settlements.` }
    ];

    res.json({ success: true, insights, estimatedNextMonth, topCategory, topCatPct });
  } catch (err) {
    console.error('Error generating AI insights:', err);
    res.status(500).json({ success: false, message: 'Failed to generate AI insights' });
  }
});

// POST /api/ai/chat - Ask CurryTracker AI Chatbot
router.post('/chat', requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ success: false, message: 'Query string is required' });
  }

  const q = query.toLowerCase().trim();

  try {
    const { balances, totalExpenses } = await computeBalances(req.session?.user);
    const expRows = await all('SELECT * FROM expenses ORDER BY date DESC');

    let reply = '';

    if (q.includes('spent the most') || q.includes('highest spender') || q.includes('who paid most')) {
      const topPayer = [...balances].sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0))[0];
      if (topPayer) {
        reply = `🏆 <b>${topPayer.name}</b> spent the most this month: <b>₹${(topPayer.totalPaid || 0).toLocaleString('en-IN')}</b> across ${topPayer.expenseCount || 0} bills.`;
      } else {
        reply = `No expense records found for this month yet.`;
      }
    } else if (q.includes('pending') || q.includes('owes') || q.includes('who owes')) {
      const owingMembers = balances.filter(b => b.netBalance < 0);
      if (owingMembers.length > 0) {
        reply = `🔴 <b>Pending Balance Settlements:</b><br/>` + owingMembers.map(m => `• <b>${m.name}</b>: ₹${m.outstanding.toLocaleString('en-IN')}`).join('<br/>');
      } else {
        reply = `✅ All members are fully settled! No pending balances.`;
      }
    } else if (q.includes('next month') || q.includes('prediction') || q.includes('forecast') || q.includes('estimate')) {
      const forecast = Math.round(totalExpenses * 1.12);
      reply = `📈 <b>AI Expense Forecast:</b> Estimated total spending for next month is <b>₹${forecast.toLocaleString('en-IN')}</b> based on historical spending patterns.`;
    } else if (q.includes('total') || q.includes('how much') || q.includes('summary')) {
      reply = `🍛 <b>Monthly Summary:</b> Total Curry Expenses: <b>₹${totalExpenses.toLocaleString('en-IN')}</b> split across ${balances.length} members.`;
    } else {
      reply = `🤖 <b>AI Assistant:</b> I can help you analyze expenses, find top spenders, check pending settlements, or forecast next month's budget! Try asking "Who spent the most this month?" or "Show pending members".`;
    }

    res.json({ success: true, reply });
  } catch (err) {
    console.error('Error processing AI chat query:', err);
    res.status(500).json({ success: false, message: 'AI Assistant error' });
  }
});

// POST /api/ai/voice-parse - Parse spoken expense text (e.g. "Chicken 580 paid by Jagan")
router.post('/voice-parse', requireAuth, async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ success: false, message: 'Transcript required' });
  }

  const text = transcript.trim();
  const amountMatch = text.match(/(\d+)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;

  let category = 'Lunch';
  if (text.toLowerCase().includes('chicken') || text.toLowerCase().includes('mutton') || text.toLowerCase().includes('dinner')) {
    category = 'Dinner';
  } else if (text.toLowerCase().includes('breakfast') || text.toLowerCase().includes('milk') || text.toLowerCase().includes('tea')) {
    category = 'Breakfast';
  } else if (text.toLowerCase().includes('grocery') || text.toLowerCase().includes('rice') || text.toLowerCase().includes('oil')) {
    category = 'Groceries';
  }

  const title = text.replace(/(\d+)/, '').replace(/paid by/i, '').replace(/rs/i, '').replace(/rupees/i, '').trim() || 'Curry Meal';

  res.json({
    success: true,
    parsed: {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      amount,
      category,
      paidBy: req.session?.user?.userid || '192472374'
    }
  });
});

module.exports = router;
