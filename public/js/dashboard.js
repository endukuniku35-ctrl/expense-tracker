/**
 * dashboard.js – Dashboard View (Dynamic 2, 3, or 4 member split model)
 */

async function loadDashboard() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `<div style="opacity:0;animation:fadeInUp 0.4s ease forwards">
    <div class="row g-3 mb-4" id="statsGrid">
      ${[1,2,3,4,5,6].map(() => `
        <div class="col-xl-2 col-md-4 col-6">
          <div class="stat-card">
            <div class="skeleton" style="width:48px;height:48px;border-radius:14px;margin-bottom:16px"></div>
            <div class="skeleton" style="height:12px;width:70%;margin-bottom:8px"></div>
            <div class="skeleton" style="height:28px;width:90%"></div>
          </div>
        </div>`).join('')}
    </div>
    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <div class="glass-card">
          <div class="card-header-custom">
            <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-chart-line"></i></div>Monthly Expense Trend</h3>
          </div>
          <div class="card-body-custom"><div class="chart-wrapper"><canvas id="lineChart"></canvas></div></div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="glass-card">
          <div class="card-header-custom">
            <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-chart-pie"></i></div>By Category</h3>
          </div>
          <div class="card-body-custom"><div class="chart-wrapper"><canvas id="pieChart"></canvas></div></div>
        </div>
      </div>
    </div>
    <!-- Split Summary Banner -->
    <div class="glass-card mb-4" id="splitSummaryCard" style="background:linear-gradient(135deg,rgba(26,115,232,0.08),rgba(52,168,83,0.08))">
      <div class="card-body-custom" id="splitSummary">
        <div style="text-align:center;color:var(--text-muted)">Loading split summary...</div>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-lg-8">
        <div class="glass-card">
          <div class="card-header-custom">
            <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-clock"></i></div>Recent Expenses</h3>
            <button class="btn-ghost" onclick="navigateTo('expenses')" style="font-size:13px">View All <i class="fas fa-arrow-right ms-1"></i></button>
          </div>
          <div id="recentExpenses"><div style="padding:20px;text-align:center;color:var(--text-muted)">Loading...</div></div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="glass-card">
          <div class="card-header-custom">
            <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-balance-scale"></i></div>Who Owes What</h3>
            <button class="btn-ghost" onclick="navigateTo('payments')" style="font-size:13px">Details <i class="fas fa-arrow-right ms-1"></i></button>
          </div>
          <div class="card-body-custom" id="whoOwesWhat">
            <div style="text-align:center;color:var(--text-muted)">Loading...</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const [statsData, chartData] = await Promise.all([
    api('/api/dashboard/stats'),
    api('/api/dashboard/charts'),
  ]);
  if (!statsData || !chartData) return;

  const { stats, balances, recentExpenses } = statsData;
  const { charts } = chartData;

  // ─── Stat Cards ───────────────────────────────────
  const cards = [
    { label: 'Total Curry Expense', value: stats.totalExpenses, icon: 'fa-utensils',         color: 'blue',   prefix: '₹' },
    { label: 'Avg Fair Share',     value: stats.perPersonShare, icon: 'fa-divide',            color: 'purple', prefix: '₹' },
    { label: 'Total Outstanding',   value: stats.totalOwed,      icon: 'fa-exclamation-circle',color: 'red',    prefix: '₹' },
    { label: 'Members',             value: stats.memberCount,    icon: 'fa-users',             color: 'green',  prefix: '' },
    { label: "Today's Expense",     value: stats.todayExpense,   icon: 'fa-calendar-day',      color: 'cyan',   prefix: '₹' },
    { label: 'This Month',          value: stats.monthExpense,   icon: 'fa-calendar-alt',      color: 'orange', prefix: '₹' },
  ];

  document.getElementById('statsGrid').innerHTML = cards.map((c, i) => `
    <div class="col-xl-2 col-md-4 col-6">
      <div class="stat-card ${c.color}" style="animation-delay:${i*0.08}s">
        <div class="stat-icon ${c.color}"><i class="fas ${c.icon}"></i></div>
        <div class="stat-label">${c.label}</div>
        <div class="stat-value" id="sv${i}">${c.prefix}0</div>
        <div class="stat-change neutral"><i class="fas fa-users"></i> Dynamic 2/3/4 Split</div>
      </div>
    </div>`).join('');

  cards.forEach((c, i) => setTimeout(() => {
    const el = document.getElementById(`sv${i}`);
    if (el) animateCounter(el, c.value, c.prefix);
  }, i * 100));

  // ─── Line Chart ───────────────────────────────────
  if (App.charts.line) App.charts.line.destroy();
  App.charts.line = new Chart(document.getElementById('lineChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: charts.monthlyLine.labels.map(l => {
        const [y, m] = l.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      }),
      datasets: [{
        label: 'Total Expense (₹)',
        data: charts.monthlyLine.data,
        borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.08)',
        borderWidth: 3, fill: true, tension: 0.4,
        pointRadius: 5, pointBackgroundColor: '#1a73e8',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '₹' + ctx.raw.toLocaleString('en-IN') } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b949e', font: { family: 'Outfit' } } },
        y: { grid: { color: 'rgba(138,148,158,0.1)' }, ticks: { color: '#8b949e', font: { family: 'Outfit' }, callback: v => '₹' + v.toLocaleString('en-IN') } }
      }
    }
  });

  // ─── Pie Chart ────────────────────────────────────
  if (App.charts.pie) App.charts.pie.destroy();
  const pieColors = ['#1a73e8','#34a853','#fbbc04','#ea4335','#00bcd4','#7c4dff','#ff9800'];
  App.charts.pie = new Chart(document.getElementById('pieChart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: charts.categoryPie.labels,
      datasets: [{ data: charts.categoryPie.data, backgroundColor: pieColors, hoverOffset: 8, borderWidth: 2, borderColor: 'var(--surface)' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Outfit', size: 11 }, padding: 12, color: '#8b949e' } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}` } }
      }
    }
  });

  // ─── Split Summary Banner ─────────────────────────
  const totalExp = stats.totalExpenses;
  document.getElementById('splitSummary').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="font-size:20px">🍛</div>
      <div>
        <div style="font-weight:700;font-size:16px;color:var(--text-primary)">Curry Expense Split Summary</div>
        <div style="font-size:13px;color:var(--text-secondary)">Expenses are split among participating members (2, 3, or 4 people per meal). Total Curry Bills = <strong>₹${totalExp.toLocaleString('en-IN')}</strong></div>
      </div>
    </div>
    <div class="row g-3">
      ${balances.map(b => {
        const isOwes = b.netBalance < 0;
        const isSettled = b.outstanding <= 0;
        return `
          <div class="col-xl-3 col-md-6">
            <div style="background:var(--surface);border-radius:14px;padding:16px;border:1px solid var(--glass-border);position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${isSettled ? '#34a853' : isOwes ? '#ea4335' : '#1a73e8'}"></div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-left:8px">
                <div class="avatar ${avatarClass(b.shortName)}" style="width:40px;height:40px;border-radius:12px;font-size:14px">${b.avatar}</div>
                <div>
                  <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${b.shortName}</div>
                  <div style="font-size:11px;color:var(--text-muted)">Paid ₹${b.totalPaid.toLocaleString('en-IN')} of bills</div>
                </div>
              </div>
              <div style="padding-left:8px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                  <span style="color:var(--text-muted)">Total fair share</span>
                  <span style="color:var(--text-secondary)">₹${Math.round(b.totalShare).toLocaleString('en-IN')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:10px">
                  <span style="color:var(--text-secondary)">${isSettled ? 'Status' : isOwes ? 'Still Owes' : 'To Receive'}</span>
                  <span style="color:${isSettled ? '#34a853' : isOwes ? '#ea4335' : '#1a73e8'}">
                    ${isSettled ? '✅ All Clear' : '₹' + Math.round(b.outstanding).toLocaleString('en-IN')}
                  </span>
                </div>
                ${isSettled
                  ? `<span class="badge-paid">✅ All settled</span>`
                  : isOwes
                    ? `<span class="badge-pending">🔴 Owes ₹${Math.round(b.outstanding).toLocaleString('en-IN')}</span>`
                    : `<span style="background:rgba(26,115,232,0.12);color:var(--primary);border:1px solid rgba(26,115,232,0.3);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">💰 To receive ₹${Math.round(b.outstanding).toLocaleString('en-IN')}</span>`
                }
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  // ─── Recent Expenses ──────────────────────────────
  const recentEl = document.getElementById('recentExpenses');
  if (!recentExpenses || recentExpenses.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-title">No expenses yet</div></div>`;
  } else {
    recentEl.innerHTML = `
      <table class="custom-table">
        <thead><tr><th>Date</th><th>Meal</th><th>Total Bill</th><th>Paid By</th><th>Split Details</th></tr></thead>
        <tbody>
          ${recentExpenses.map(e => {
            const splitList = (Array.isArray(e.splitBetween) && e.splitBetween.length > 0) ? e.splitBetween : ['192472374', '192472343', '192411184', '192411185'];
            const count = splitList.length;
            const eachAmount = Math.round(e.amount / count);

            return `
              <tr>
                <td style="color:var(--text-muted);font-size:13px">${formatDate(e.date)}</td>
                <td><strong>${e.title}</strong><div style="font-size:11px;color:var(--text-muted)">${e.category}</div></td>
                <td><strong style="color:var(--primary)">${formatCurrency(e.amount)}</strong></td>
                <td><div style="display:flex;align-items:center;gap:8px">
                  <div class="avatar ${avatarClass(e.paidByName)}">${e.paidByName.substring(0,2).toUpperCase()}</div>${e.paidByName}
                </div></td>
                <td>
                  <strong style="color:var(--secondary)">${formatCurrency(eachAmount)}</strong> / person
                  <div style="font-size:10px;color:var(--text-muted)">÷ ${count} members</div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  // ─── Who Owes What ────────────────────────────────
  const owesEl = document.getElementById('whoOwesWhat');
  const owingMembers = balances.filter(b => b.outstanding > 0);
  if (owingMembers.length === 0) {
    owesEl.innerHTML = `<div class="empty-state" style="padding:30px"><div style="font-size:40px">🎉</div><div class="empty-title">All Settled!</div><div class="empty-desc">Everyone is square.</div></div>`;
  } else {
    owesEl.innerHTML = owingMembers.map(b => {
      const isOwes = b.netBalance < 0;
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--glass-border)">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar ${avatarClass(b.shortName)}" style="width:36px;height:36px;border-radius:10px;font-size:12px">${b.avatar}</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${b.shortName}</div>
            <div style="font-size:11px;color:var(--text-muted)">${isOwes ? 'Needs to pay' : 'Should receive'}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:800;color:${isOwes ? 'var(--danger)' : 'var(--primary)'}">
            ${formatCurrency(Math.round(b.outstanding))}
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${isOwes ? 'still owes' : 'to collect'}</div>
        </div>
      </div>`;
    }).join('');
  }
}
