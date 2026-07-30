/**
 * duties.js – Item Duty & Task Assignment Route
 * Allows assigning specific duties/items (Curry, Rice, Cleaning, Water, etc.) to 4 members with admin control.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { run, all, get } = require('../database');
const { sendPushToAllSubscribers } = require('../push_service');
const { sendTelegramMessage } = require('../telegram');

// Ensure database table for duties exists
async function initDutiesTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS duties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      assignedToId TEXT NOT NULL,
      assignedToName TEXT NOT NULL,
      assignedById TEXT NOT NULL,
      assignedByName TEXT NOT NULL,
      category TEXT,
      frequency TEXT DEFAULT 'Daily',
      status TEXT DEFAULT 'pending',
      dueDate TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
}
initDutiesTable().catch(err => console.error('[Duties DB Error]:', err));

// GET /api/duties - Get all duty assignments & member duty stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const duties = await all('SELECT * FROM duties ORDER BY createdAt DESC');
    const members = await all('SELECT userid, name, shortName, avatar, role FROM users ORDER BY userid ASC');

    // Compute duty count & compliance rate per member
    const dutyStats = {};
    members.forEach(m => {
      dutyStats[m.userid] = { totalAssigned: 0, pending: 0, completed: 0, complianceRate: 100 };
    });

    (duties || []).forEach(d => {
      if (dutyStats[d.assignedToId]) {
        dutyStats[d.assignedToId].totalAssigned += 1;
        if (d.status === 'completed') dutyStats[d.assignedToId].completed += 1;
        else dutyStats[d.assignedToId].pending += 1;
      }
    });

    // Calculate percentage score
    members.forEach(m => {
      const s = dutyStats[m.userid];
      if (s.totalAssigned > 0) {
        s.complianceRate = Math.round((s.completed / s.totalAssigned) * 100);
      } else {
        s.complianceRate = 100;
      }
    });

    res.json({
      success: true,
      duties: duties || [],
      members: members || [],
      dutyStats
    });
  } catch (err) {
    console.error('Error fetching duties:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch duties' });
  }
});

// POST /api/duties/assign - Admin assigns a new duty/item to a member
router.post('/assign', requireAuth, async (req, res) => {
  try {
    const { title, assignedToId, category, frequency, dueDate, notes } = req.body;
    if (!title || !assignedToId) {
      return res.status(400).json({ success: false, message: 'Please provide duty title and assigned member' });
    }

    const assignedMember = await get('SELECT name FROM users WHERE userid = ?', [assignedToId]);
    if (!assignedMember) {
      return res.status(400).json({ success: false, message: 'Assigned member not found' });
    }

    const id = 'duty_' + Date.now();
    const createdAt = new Date().toISOString();
    const dueDateStr = dueDate || new Date().toISOString().split('T')[0];
    const assignerName = req.user.name || req.user.shortName || 'Admin Jagan';

    await run(
      `INSERT INTO duties (id, title, assignedToId, assignedToName, assignedById, assignedByName, category, frequency, status, dueDate, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title.trim(),
        assignedToId,
        assignedMember.name,
        req.user.userid,
        assignerName,
        category || 'Household',
        frequency || 'Daily',
        'pending',
        dueDateStr,
        notes || '',
        createdAt,
        createdAt
      ]
    );

    // Notify Telegram & Push
    const alertMsg = `📌 <b>New Duty Assigned!</b>\n\n🎯 <b>Duty:</b> ${title.trim()}\n👤 <b>Assigned To:</b> <b>${assignedMember.name}</b>\n👑 <b>Assigned By:</b> ${assignerName}\n📅 <b>Due Date:</b> ${dueDateStr}\n\n<i>Jagan Money Expense Tracker</i>`;
    sendTelegramMessage(alertMsg).catch(() => {});
    sendPushToAllSubscribers('New Duty Assigned 📌', `"${title.trim()}" assigned to ${assignedMember.name}!`).catch(() => {});

    res.json({
      success: true,
      message: `Duty "${title.trim()}" assigned to ${assignedMember.name} successfully!`,
      duty: { id, title, assignedToId, assignedToName: assignedMember.name, status: 'pending' }
    });
  } catch (err) {
    console.error('Error assigning duty:', err);
    res.status(500).json({ success: false, message: 'Failed to assign duty' });
  }
});

// POST /api/duties/update-status - Update duty status (pending -> completed)
router.post('/update-status', requireAuth, async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ success: false, message: 'Invalid request' });

    const duty = await get('SELECT * FROM duties WHERE id = ?', [id]);
    if (!duty) return res.status(404).json({ success: false, message: 'Duty not found' });

    const updatedAt = new Date().toISOString();
    await run('UPDATE duties SET status = ?, updatedAt = ? WHERE id = ?', [status, updatedAt, id]);

    if (status === 'completed') {
      const msg = `✅ <b>Duty Completed!</b>\n\n📌 <b>Duty:</b> ${duty.title}\n👤 <b>Done By:</b> ${duty.assignedToName}\n\n<i>Jagan Money Expense Tracker</i>`;
      sendTelegramMessage(msg).catch(() => {});
      sendPushToAllSubscribers('Duty Completed ✅', `"${duty.title}" completed by ${duty.assignedToName}!`).catch(() => {});
    }

    res.json({ success: true, message: `Duty status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update duty status' });
  }
});

// DELETE /api/duties/:id - Remove duty assignment
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM duties WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Duty removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete duty' });
  }
});

// POST /api/duties/nudge - Send reminder alert for a pending/missing duty
router.post('/nudge', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;
    const duty = await get('SELECT * FROM duties WHERE id = ?', [id]);
    if (!duty) return res.status(404).json({ success: false, message: 'Duty not found' });

    const nudgeMsg = `⚠️ <b>Duty Reminder Alert!</b>\n\n📌 <b>Duty:</b> ${duty.title}\n👤 <b>Assigned To:</b> <b>${duty.assignedToName}</b>\n⏰ <b>Status:</b> Pending / Action Required!\n📅 <b>Due Date:</b> ${duty.dueDate || 'Today'}\n\n<i>Jagan Money Expense Tracker</i>`;
    sendTelegramMessage(nudgeMsg).catch(() => {});
    sendPushToAllSubscribers('Duty Reminder ⚠️', `Hey ${duty.assignedToName}, please complete: "${duty.title}"!`).catch(() => {});

    res.json({ success: true, message: `Reminder sent to ${duty.assignedToName}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send reminder' });
  }
});

module.exports = router;
