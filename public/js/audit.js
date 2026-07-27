/**
 * audit.js – System Audit Trail Logger & Change Tracker Controller
 */

window.loadAuditView = async function loadAuditView() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-history"></i></div>
            System Audit Trail & Log History
          </h3>
        </div>
        <div id="auditLogContent" class="card-body-custom">
          <div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading audit history...</div>
        </div>
      </div>
    </div>
  `;

  const res = await api('/api/audit');
  const body = document.getElementById('auditLogContent');
  if (!res || !res.success || !body) return;

  const logs = res.data || [];
  if (logs.length === 0) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No system audit logs found yet.</div>`;
    return;
  }

  body.innerHTML = `
    <div class="table-responsive">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Performed By</th>
            <th>Details & Changes</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td style="font-size:12px;color:var(--text-muted);white-space:nowrap">${formatDate(l.timestamp)}</td>
              <td><span class="badge bg-primary">${l.action}</span></td>
              <td style="font-weight:600;color:var(--text-primary)">${l.performedByName} <small style="color:var(--text-muted)">(${l.performedBy})</small></td>
              <td><code style="font-size:12px;background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:6px;color:var(--text-secondary)">${escapeHtml(l.details || '{}')}</code></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};
