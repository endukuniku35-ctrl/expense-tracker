/**
 * groups.js – Multi-House & QR Code Group Join Controller
 */

window.loadGroupsView = async function loadGroupsView() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-building"></i></div>
            Multi-House & Hostel Group Directory
          </h3>
          <button class="btn-primary-custom" onclick="openQRGroupJoinModal()">
            <i class="fas fa-qrcode me-1"></i>QR Code Group Join
          </button>
        </div>
        <div id="groupsContent" class="card-body-custom">
          <div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading room groups...</div>
        </div>
      </div>
    </div>
  `;

  const res = await api('/api/groups/list');
  const body = document.getElementById('groupsContent');
  if (!res || !res.success || !body) return;

  const groups = res.groups || [];

  body.innerHTML = `
    <div class="row g-3">
      ${groups.map(g => `
        <div class="col-md-6 col-lg-3">
          <div style="background:var(--surface);border:1px solid var(--glass-border);border-radius:16px;padding:18px">
            <div style="font-weight:800;font-size:16px;color:var(--text-primary);margin-bottom:4px">${g.name}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Code: <code>${g.code}</code> &bull; ${g.block}</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="badge bg-primary" style="font-size:11px">${g.membersCount} Active Members</span>
              <button class="btn-ghost" style="font-size:12px;color:var(--primary)" onclick="showGroupQR('${g.code}')">
                <i class="fas fa-qrcode me-1"></i>QR Code
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

window.showGroupQR = async function showGroupQR(code) {
  const res = await api(`/api/groups/qr-join/${code}`);
  if (!res || !res.success) return;

  let modal = document.getElementById('qrGroupModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'qrGroupModal';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="background:var(--surface);border:1px solid var(--glass-border);border-radius:18px">
          <div class="modal-header">
            <h5 class="modal-title" style="font-size:16px"><i class="fas fa-qrcode me-2 text-primary"></i>Scan QR to Join</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center" style="padding:20px">
            <img id="qrGroupImg" src="" style="width:200px;height:200px;border-radius:12px;border:2px solid var(--primary);margin-bottom:12px" />
            <div id="qrGroupCodeText" style="font-weight:700;font-size:14px;color:var(--text-primary)"></div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Scan or share this link to join group</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById('qrGroupImg').src = res.qrUrl;
  document.getElementById('qrGroupCodeText').textContent = `Group Code: ${res.code}`;
  new bootstrap.Modal(modal).show();
};

window.openQRGroupJoinModal = function openQRGroupJoinModal() {
  const code = prompt('Enter Group Code to Join (e.g. FLAT-301, HOSTEL-A):', 'FLAT-301');
  if (code) showGroupQR(code.trim().toUpperCase());
};
