/**
 * Reports & Export Routes (SQLite Backend)
 * GET /api/reports/monthly   - monthly breakdown
 * GET /api/reports/member    - member-wise report
 * GET /api/reports/category  - category report
 * GET /api/reports/export    - export CSV/Excel/PDF
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { all } = require('../database');

const ALL_MEMBER_IDS = ['192472374', '192472343', '192411184', '192411185'];

async function getExpenses() {
  const rows = await all('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
  return rows.map(r => ({
    ...r,
    splitBetween: r.splitBetween ? JSON.parse(r.splitBetween) : ALL_MEMBER_IDS
  }));
}

// GET /api/reports/monthly
router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const expenses = await getExpenses();
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const monthlyData = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${targetYear}-${String(m).padStart(2, '0')}`;
      monthlyData[key] = { month: key, total: 0, count: 0, expenses: [] };
    }

    expenses.forEach(e => {
      const key = e.date.substring(0, 7);
      if (monthlyData[key]) {
        monthlyData[key].total += e.amount;
        monthlyData[key].count++;
        monthlyData[key].expenses.push(e);
      }
    });

    res.json({ success: true, data: Object.values(monthlyData) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to generate monthly report' });
  }
});

// GET /api/reports/member
router.get('/member', requireAuth, async (req, res) => {
  try {
    const expenses = await getExpenses();
    const memberReport = {};
    expenses.forEach(e => {
      if (!memberReport[e.paidByName]) {
        memberReport[e.paidByName] = { name: e.paidByName, memberId: e.paidBy, totalPaid: 0, count: 0, expenses: [] };
      }
      memberReport[e.paidByName].totalPaid += e.amount;
      memberReport[e.paidByName].count++;
      memberReport[e.paidByName].expenses.push(e);
    });

    res.json({ success: true, data: Object.values(memberReport) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to generate member report' });
  }
});

// GET /api/reports/category
router.get('/category', requireAuth, async (req, res) => {
  try {
    const expenses = await getExpenses();
    const catMap = {};
    expenses.forEach(e => {
      if (!catMap[e.category]) catMap[e.category] = { category: e.category, total: 0, count: 0 };
      catMap[e.category].total += e.amount;
      catMap[e.category].count++;
    });
    res.json({ success: true, data: Object.values(catMap).sort((a, b) => b.total - a.total) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to generate category report' });
  }
});

// GET /api/reports/export?type=csv|excel|pdf
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { type = 'csv', month, member } = req.query;
    let expenses = await getExpenses();

    if (month) expenses = expenses.filter(e => e.date.startsWith(month));
    if (member) expenses = expenses.filter(e => e.paidBy === member);
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const exportData = expenses.map(e => ({
      Date: e.date,
      Title: e.title,
      Description: e.description,
      Amount: e.amount,
      'Paid By': e.paidByName,
      'Split Between': (e.splitBetween || []).length + ' members',
      Category: e.category,
      Notes: e.notes || ''
    }));

    if (type === 'csv') {
      const { Parser } = require('json2csv');
      const parser = new Parser();
      const csv = parser.parse(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="curry-expenses.csv"');
      return res.send(csv);
    }

    if (type === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Curry Expenses');

      sheet.columns = [
        { header: 'Date', key: 'Date', width: 15 },
        { header: 'Title', key: 'Title', width: 25 },
        { header: 'Description', key: 'Description', width: 35 },
        { header: 'Amount (₹)', key: 'Amount', width: 15 },
        { header: 'Paid By', key: 'Paid By', width: 20 },
        { header: 'Split Between', key: 'Split Between', width: 20 },
        { header: 'Category', key: 'Category', width: 15 },
        { header: 'Notes', key: 'Notes', width: 30 }
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a73e8' } };
      headerRow.alignment = { horizontal: 'center' };

      exportData.forEach(d => sheet.addRow(d));

      const totalRow = sheet.addRow({ Date: 'TOTAL', Amount: expenses.reduce((s, e) => s + e.amount, 0) });
      totalRow.font = { bold: true };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="curry-expenses.xlsx"');
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (type === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="curry-expenses.pdf"');
      doc.pipe(res);

      doc.fontSize(20).fillColor('#1a73e8').text('🍛 Curry Expense Tracker - Report', { align: 'center' });
      doc.fontSize(11).fillColor('#666').text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
      doc.moveDown();

      const total = expenses.reduce((s, e) => s + e.amount, 0);
      doc.fontSize(12).fillColor('#333').text(`Total Records: ${expenses.length}   |   Total Amount: ₹${total.toLocaleString('en-IN')}`, { align: 'center' });
      doc.moveDown();

      const cols = [60, 130, 260, 390, 460, 550, 650];
      const headers = ['Date', 'Title', 'Description', 'Amount', 'Paid By', 'Category', 'Notes'];

      doc.rect(30, doc.y, 770, 20).fill('#1a73e8');
      doc.fillColor('#fff').fontSize(10);
      headers.forEach((h, i) => doc.text(h, cols[i], doc.y - 15, { width: cols[i + 1] ? cols[i + 1] - cols[i] : 100 }));
      doc.moveDown(0.5);

      doc.fillColor('#333').fontSize(9);
      expenses.forEach((e, idx) => {
        if (doc.y > 520) { doc.addPage({ layout: 'landscape' }); }
        const bg = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(30, doc.y, 770, 18).fill(bg);
        doc.fillColor('#333');
        doc.text(e.date, cols[0], doc.y - 13, { width: 65 });
        doc.text(e.title, cols[1], doc.y - 13, { width: 125 });
        doc.text((e.description || '').substring(0, 25), cols[2], doc.y - 13, { width: 125 });
        doc.text(`₹${e.amount.toLocaleString('en-IN')}`, cols[3], doc.y - 13, { width: 65 });
        doc.text(e.paidByName, cols[4], doc.y - 13, { width: 85 });
        doc.text(e.category, cols[5], doc.y - 13, { width: 95 });
        doc.text((e.notes || '').substring(0, 20), cols[6], doc.y - 13, { width: 100 });
        doc.moveDown(0.8);
      });

      doc.end();
    }
  } catch (e) {
    res.status(500).json({ success: false, message: 'Export failed: ' + e.message });
  }
});

module.exports = router;
