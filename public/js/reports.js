/**
 * reports.js – Reports & Export View
 */

async function loadReports() {
  const content = document.getElementById('viewContent');
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = `${defaultYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <!-- Export Controls -->
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-file-export"></i></div>
            Export Reports
          </h3>
        </div>
        <div class="card-body-custom">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label-custom">Filter by Month</label>
              <input type="month" class="form-control-custom" id="exportMonth" value="${defaultMonth}" />
            </div>
            <div class="col-md-3">
              <label class="form-label-custom">Filter by Member</label>
              <select class="form-control-custom" id="exportMember">
                <option value="">All Members</option>
                <option value="192472374">Jagan</option>
                <option value="192472343">Sagar</option>
                <option value="192411184">Prathap</option>
                <option value="192411185">Bharath</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label-custom">Export Format</label>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn-success-custom" onclick="exportReport('csv')">
                  <i class="fas fa-file-csv me-1"></i>Export CSV
                </button>
                <button class="btn-primary-custom" onclick="exportReport('excel')">
                  <i class="fas fa-file-excel me-1"></i>Export Excel
                </button>
                <button class="btn-danger-custom" onclick="exportReport('pdf')">
                  <i class="fas fa-file-pdf me-1"></i>Export PDF
                </button>
                <button class="btn-ghost" onclick="window.print()">
                  <i class="fas fa-print me-1"></i>Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Tabs -->
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-chart-bar"></i></div>
            Report Analytics
          </h3>
          <div style="display:flex;gap:8px">
            <button class="btn-primary-custom report-tab active" data-tab="monthly" onclick="switchReportTab('monthly')" style="padding:8px 16px;font-size:13px">
              <i class="fas fa-calendar-alt me-1"></i>Monthly
            </button>
            <button class="btn-ghost report-tab" data-tab="member" onclick="switchReportTab('member')" style="font-size:13px">
              <i class="fas fa-users me-1"></i>By Member
            </button>
            <button class="btn-ghost report-tab" data-tab="category" onclick="switchReportTab('category')" style="font-size:13px">
              <i class="fas fa-tags me-1"></i>By Category
            </button>
          </div>
        </div>
        <div id="reportContent" class="card-body-custom">
          <div style="text-align:center;padding:40px;color:var(--text-muted)">
            <div class="loader-spinner" style="margin:0 auto 12px"></div>Loading report...
          </div>
        </div>
      </div>
    </div>
  `;

  switchReportTab('monthly');
}

async function switchReportTab(tab) {
  // Update tab styles
  document.querySelectorAll('.report-tab').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.className = isActive ? 'btn-primary-custom report-tab' : 'btn-ghost report-tab';
    if (!isActive) btn.style.fontSize = '13px';
    else btn.style.cssText = 'padding:8px 16px;font-size:13px';
  });

  const reportEl = document.getElementById('reportContent');
  reportEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading...</div>`;

  if (tab === 'monthly') {
    const data = await api('/api/reports/monthly');
    if (!data) return;

    const rows = data.data.filter(m => m.total > 0 || m.count > 0);
    const total = rows.reduce((s, m) => s + m.total, 0);

    reportEl.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr>
            <th>Month</th><th>Expenses Count</th><th>Total Amount</th>
            <th>Average</th><th>Share of Total</th><th>Visual</th>
          </tr></thead>
          <tbody>
            ${data.data.map(m => {
              const pct = total > 0 ? Math.round((m.total / total) * 100) : 0;
              return `
                <tr>
                  <td style="font-weight:600">${monthLabel(m.month)}</td>
                  <td><span class="badge-cat">${m.count} records</span></td>
                  <td><strong style="color:var(--primary)">${formatCurrency(m.total)}</strong></td>
                  <td style="color:var(--text-secondary)">${m.count > 0 ? formatCurrency(Math.round(m.total / m.count)) : '-'}</td>
                  <td style="color:var(--text-secondary)">${pct}%</td>
                  <td style="min-width:120px">
                    <div class="progress-custom"><div class="progress-fill" style="width:${pct}%"></div></div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-2)">
              <td colspan="2"><strong>TOTAL</strong></td>
              <td colspan="4"><strong style="color:var(--primary)">${formatCurrency(total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  if (tab === 'member') {
    const data = await api('/api/reports/member');
    if (!data) return;
    const total = data.data.reduce((s, m) => s + m.totalPaid, 0);

    reportEl.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr>
            <th>Member</th><th>Total Expenses</th><th>Total Paid</th>
            <th>Average Per Expense</th><th>% of Total</th><th>Visual</th>
          </tr></thead>
          <tbody>
            ${data.data.map(m => {
              const pct = total > 0 ? Math.round((m.totalPaid / total) * 100) : 0;
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="avatar ${avatarClass(m.name)}">${m.name.substring(0,2).toUpperCase()}</div>
                      <strong>${m.name}</strong>
                    </div>
                  </td>
                  <td><span class="badge-cat">${m.count}</span></td>
                  <td><strong style="color:var(--primary)">${formatCurrency(m.totalPaid)}</strong></td>
                  <td>${m.count > 0 ? formatCurrency(Math.round(m.totalPaid / m.count)) : '-'}</td>
                  <td>${pct}%</td>
                  <td style="min-width:120px">
                    <div class="progress-custom"><div class="progress-fill" style="width:${pct}%"></div></div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  if (tab === 'category') {
    const data = await api('/api/reports/category');
    if (!data) return;
    const total = data.data.reduce((s, c) => s + c.total, 0);
    const catIcons = { Lunch: '🍱', Dinner: '🍽️', Breakfast: '🍳', Snacks: '🍿', General: '📦' };

    reportEl.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr>
            <th>Category</th><th>Count</th><th>Total</th>
            <th>Average</th><th>% of Total</th><th>Visual</th>
          </tr></thead>
          <tbody>
            ${data.data.map(c => {
              const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
              return `
                <tr>
                  <td>
                    <span style="font-size:18px;margin-right:8px">${catIcons[c.category] || '📦'}</span>
                    <strong>${c.category}</strong>
                  </td>
                  <td><span class="badge-cat">${c.count}</span></td>
                  <td><strong style="color:var(--primary)">${formatCurrency(c.total)}</strong></td>
                  <td>${c.count > 0 ? formatCurrency(Math.round(c.total / c.count)) : '-'}</td>
                  <td>${pct}%</td>
                  <td style="min-width:120px">
                    <div class="progress-custom"><div class="progress-fill" style="width:${pct}%"></div></div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-');
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function exportReport(type) {
  const month = document.getElementById('exportMonth')?.value || '';
  const member = document.getElementById('exportMember')?.value || '';
  const url = `/api/reports/export?type=${type}&month=${month}&member=${member}`;
  showToast('Exporting...', `Preparing ${type.toUpperCase()} download.`, 'info', 2000);
  window.open(url, '_blank');
}
