/**
 * calendar.js – Interactive Monthly Expense Calendar View
 */

window.loadCalendarView = async function loadCalendarView() {
  const content = document.getElementById('viewContent');
  const month = new Date().toISOString().substring(0, 7);

  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-calendar-alt text-primary"></i></div>
            Monthly Expense Calendar View
          </h3>
          <input type="month" id="calendarMonthInput" value="${month}" onchange="renderCalendarGrid(this.value)" class="form-control-custom" style="width:170px;font-size:13px" />
        </div>
        <div id="calendarGridContainer" class="card-body-custom">
          <div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading calendar...</div>
        </div>
      </div>
    </div>
  `;

  renderCalendarGrid(month);
};

window.renderCalendarGrid = async function renderCalendarGrid(monthStr) {
  const container = document.getElementById('calendarGridContainer');
  if (!container) return;

  const res = await api(`/api/calendar/month?month=${monthStr}`);
  if (!res || !res.success) return;

  const dateMap = res.dateMap || {};
  const [year, m] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();

  let html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dateMap[dStr];

    if (dayData) {
      html += `
        <div style="background:linear-gradient(135deg,rgba(26,115,232,0.12),rgba(52,168,83,0.12));border:1px solid rgba(26,115,232,0.3);border-radius:12px;padding:12px;text-align:center;cursor:pointer" onclick="showDayDetails('${dStr}')">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px">Day ${day}</div>
          <div style="font-size:16px;font-weight:900;color:var(--primary)">₹${dayData.total.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2px">${dayData.count} bill(s)</div>
        </div>
      `;
    } else {
      html += `
        <div style="background:var(--bg-1);border:1px dashed var(--glass-border);border-radius:12px;padding:12px;text-align:center;opacity:0.5">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">Day ${day}</div>
          <div style="font-size:13px;color:var(--text-muted)">-</div>
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
};

window.showDayDetails = async function showDayDetails(dateStr) {
  const res = await api(`/api/calendar/month?month=${dateStr.substring(0, 7)}`);
  if (!res || !res.success) return;

  const dayData = res.dateMap[dateStr];
  if (!dayData) return;

  const itemsText = dayData.items.map(i => `• ${i.title}: ₹${i.amount} (Paid by ${i.paidByName})`).join('\n');
  alert(`📅 Expenses for ${dateStr}:\n\nTotal: ₹${dayData.total}\n\n${itemsText}`);
};
