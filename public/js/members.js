/**
 * members.js – Dynamic Members View & Add Member Controller
 */

window.loadMembers = async function loadMembers() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <!-- How It Works Banner -->
      <div class="glass-card mb-4" style="background:linear-gradient(135deg,rgba(26,115,232,0.06),rgba(52,168,83,0.06));border:1px solid rgba(26,115,232,0.2)">
        <div class="card-body-custom" style="padding:16px 24px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="font-size:28px">🍛</div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">How the Split Works</div>
              <div style="font-size:13px;color:var(--text-secondary)">
                Every curry meal is split equally among participating members.
                When one person pays the full bill, each member owes their share back.
                Check your card below to see how much you still owe.
              </div>
            </div>
            <div style="margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              ${(App.currentUser?.role === 'super_admin' || App.currentUser?.userid === '192472374') ? `<button class="btn-warning-custom" onclick="openCreateAdminModal()" style="font-size:13px"><i class="fas fa-user-shield me-1"></i>Create Group Admin</button>` : ''}
              ${App.isAdmin ? `<button class="btn-primary-custom" onclick="openAddMemberModal()" style="font-size:13px"><i class="fas fa-user-plus me-1"></i>Add New Member</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Member Cards -->
      <div class="row g-3 mb-4" id="memberCards">
        <div class="col-12 text-center" style="padding:40px;color:var(--text-muted)">
          <div class="loader-spinner" style="margin:0 auto 12px"></div>Loading members balance...
        </div>
      </div>

      <!-- Detailed Table -->
      <div class="glass-card">
        <div class="card-header-custom">
          <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-table"></i></div>Member Balance Sheet</h3>
          ${App.isAdmin ? `<button class="btn-primary-custom" onclick="openAddMemberModal()" style="font-size:13px"><i class="fas fa-user-plus me-1"></i>Add Member</button>` : ''}
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead><tr>
              <th>Member</th>
              <th>Bills Paid</th>
              <th>Fair Share</th>
              <th>Amount Due</th>
              <th>Status</th>
              <th>Meals</th>
              <th>Progress</th>
              <th>Action</th>
            </tr></thead>
            <tbody id="memberTableBody">
              <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Settlement History -->
      <div class="glass-card mt-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-handshake"></i></div>Settlement History</h3>
          ${App.isAdmin ? `<button class="btn-success-custom" onclick="openSettleModal()" style="font-size:13px"><i class="fas fa-plus me-1"></i>Record Settlement</button>` : ''}
        </div>
        <div id="settlementList">
          <div style="padding:32px;text-align:center;color:var(--text-muted)">Loading...</div>
        </div>
      </div>

      ${App.isAdmin ? `
      <!-- Admin Only: Member Logins & Credentials Directory -->
      <div class="glass-card mt-4 mb-4" style="border:1px solid rgba(234,67,53,0.3)">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon" style="background:rgba(234,67,53,0.1);color:#ea4335"><i class="fas fa-key"></i></div>
            Registered Member Logins Directory
            <span style="background:rgba(234,67,53,0.12);color:#ea4335;border:1px solid rgba(234,67,53,0.3);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-left:10px">🔒 Admin Only - Hidden from users</span>
          </h3>
          <button class="btn-primary-custom" onclick="openAddMemberModal()" style="font-size:13px">
            <i class="fas fa-user-plus me-1"></i>Add New Member Account
          </button>
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead><tr>
              <th>Member Name</th>
              <th>Login User ID</th>
              <th>Password</th>
              <th>Role</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="adminCredentialsTableBody">
              <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Loading credentials directory...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}
    </div>`;

  try {
    const data = await api('/api/balance');

    if (!data || !data.success || !Array.isArray(data.balances)) {
      const errorHtml = `
        <div style="padding:40px;text-align:center;color:var(--text-muted)">
          <div style="font-size:32px;margin-bottom:8px">⚠️</div>
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">Failed to load member balance data</div>
          <div style="font-size:13px;margin-bottom:16px">The server could not process the request.</div>
          <button class="btn-primary-custom" onclick="loadMembers()"><i class="fas fa-sync me-1"></i>Retry Loading</button>
        </div>`;
      document.getElementById('memberCards').innerHTML = errorHtml;
      document.getElementById('memberTableBody').innerHTML = `<tr><td colspan="7" style="text-align:center">${errorHtml}</td></tr>`;
      document.getElementById('settlementList').innerHTML = errorHtml;
      return;
    }

    const balances = data.balances || [];
    const totalExpenses = data.totalExpenses || 0;
    const perPersonShare = data.perPersonShare || 0;
    const settlements = data.settlements || [];

    // Store balances globally for settlement modal
    window.currentBalances = balances;

    // ─── Member Cards & Table Filtering for User ───────
    const me = App.currentUser;
    const visibleBalances = App.isAdmin ? balances : balances.filter(b => b.userid === me?.userid);

    // ─── Member Cards ─────────────────────────────────
    const cardsEl = document.getElementById('memberCards');
    cardsEl.innerHTML = visibleBalances.map((b, i) => {
      const totalPaid  = b.totalPaid || 0;
      const totalShare = b.totalShare || 0;
      const settledOut = b.settledOut || 0;
      const settledIn  = b.settledIn || 0;

      // Effective Net Balance after settlements
      const net = Math.round((totalPaid + settledOut) - (totalShare + settledIn));
      const out = Math.abs(net);
      const isOwes = net < 0;
      const isSettled = out <= 0;
      const totalPaidEffective = totalPaid + settledOut;
      const pct = totalShare > 0 ? Math.min(100, Math.round((totalPaidEffective / totalShare) * 100)) : 0;
      const accentColor = isSettled ? '#34a853' : isOwes ? '#ea4335' : '#1a73e8';

      return `
        <div class="col-xl-3 col-md-6">
          <div class="payment-card" style="animation-delay:${i*0.1}s;border-top:3px solid ${accentColor}">
            <!-- Avatar + name -->
              ${(b.userid === '192472374' || b.role === 'admin') ? `
                <img src="/images/logo_brand.png" style="width:56px;height:56px;border-radius:16px;object-fit:cover;border:2px solid var(--primary);box-shadow:0 4px 12px rgba(0,0,0,0.15)" />
              ` : `
                <div class="avatar ${avatarClass(b.shortName || b.name)}" style="width:56px;height:56px;border-radius:16px;font-size:20px">${b.avatar || '👤'}</div>
              `}
              <div>
                <div style="font-size:18px;font-weight:800;color:var(--text-primary)">${b.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">ID: ${b.userid} ${b.role === 'admin' ? '<span class="badge bg-primary ms-1">Admin</span>' : ''}</div>
              </div>
            </div>

            <!-- Key numbers -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
              <div style="background:var(--bg-2);border-radius:10px;padding:12px;text-align:center">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">Bills Paid</div>
                <div style="font-size:17px;font-weight:800;color:var(--primary)">₹${totalPaid.toLocaleString('en-IN')}</div>
              </div>
              <div style="background:var(--bg-2);border-radius:10px;padding:12px;text-align:center">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">Fair Share</div>
                <div style="font-size:17px;font-weight:800;color:var(--text-secondary)">₹${Math.round(totalShare).toLocaleString('en-IN')}</div>
              </div>
              <div style="background:${isSettled?'rgba(52,168,83,0.1)':isOwes?'rgba(234,67,53,0.1)':'rgba(26,115,232,0.1)'};border-radius:10px;padding:12px;text-align:center;grid-column:span 2">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">${isSettled ? '✅ All Settled' : isOwes ? '🔴 Still Owes' : '💰 To Collect'}</div>
                <div style="font-size:24px;font-weight:900;color:${accentColor}">
                  ${isSettled ? 'Nothing to pay!' : '₹' + Math.round(out).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <!-- Progress: bills paid vs fair share -->
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:var(--text-muted)">Paid vs Share (${pct}%)</span>
              </div>
              <div class="progress-custom" style="height:10px">
                <div class="progress-fill ${pct < 50 ? 'danger' : pct < 100 ? 'warning' : ''}" style="width:${Math.min(pct, 100)}%"></div>
              </div>
            </div>

            <!-- Status badge & QR Pay Button -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${isOwes && !isSettled ? '10px' : '0'}">
              ${isSettled
                ? `<span class="badge-paid">✅ Settled</span>`
                : isOwes
                  ? `<span class="badge-pending">🔴 Owes ₹${Math.round(out).toLocaleString('en-IN')}</span>`
                  : `<span style="background:rgba(26,115,232,0.12);color:var(--primary);border:1px solid rgba(26,115,232,0.3);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">💰 Receive ₹${Math.round(out).toLocaleString('en-IN')}</span>`
              }
              <span style="font-size:12px;color:var(--text-muted)">${b.expenseCount || 0} meals paid</span>
            </div>
            ${isOwes && !isSettled ? `
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="btn-success-custom flex-fill" style="padding:8px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:4px;border-radius:10px" onclick="openPayUpiQrModal('${b.userid}', '${b.name}', '192472374', 'Jagan', ${Math.round(out)})">
                  <i class="fas fa-qrcode"></i> Pay ₹${Math.round(out).toLocaleString('en-IN')}
                </button>
                ${App.isAdmin ? `
                  <button class="btn-primary-custom" style="padding:8px 10px;font-size:11px;border-radius:10px" title="Mark fully paid" onclick="quickSettleFull('${b.userid}', '${b.name}', '192472374', 'Jagan', ${Math.round(out)})">
                    <i class="fas fa-check-double me-1"></i>Clear All
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>`;
    }).join('');

    // ─── Table ────────────────────────────────────────
    const tbody = document.getElementById('memberTableBody');
    tbody.innerHTML = visibleBalances.map(b => {
      const totalPaid  = b.totalPaid || 0;
      const totalShare = b.totalShare || 0;
      const settledOut = b.settledOut || 0;
      const settledIn  = b.settledIn || 0;

      // Effective Net Balance after settlements
      const net = Math.round((totalPaid + settledOut) - (totalShare + settledIn));
      const out = Math.abs(net);
      const isOwes = net < 0;
      const isSettled = out <= 0;
      const maxAbs = Math.max(...balances.map(x => Math.abs(((x.totalPaid||0)+(x.settledOut||0)) - ((x.totalShare||0)+(x.settledIn||0)))), 1);
      const barPct = Math.round((Math.abs(net) / maxAbs) * 100);

      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar ${avatarClass(b.shortName || b.name)}">${b.avatar || '👤'}</div>
            <div>
              <div style="font-weight:600">${b.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${b.userid}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--primary)">₹${(b.totalPaid || 0).toLocaleString('en-IN')}</strong></td>
        <td style="color:var(--text-secondary)">₹${Math.round(b.totalShare || 0).toLocaleString('en-IN')}</td>
        <td>
          <strong style="color:${isSettled ? '#34a853' : isOwes ? '#ea4335' : '#1a73e8'}">
            ${isSettled ? '✅ ₹0' : isOwes ? '₹' + Math.round(out).toLocaleString('en-IN') : '💰 ₹' + Math.round(out).toLocaleString('en-IN')}
          </strong>
        </td>
        <td>${isSettled
          ? `<span class="badge-paid">✅ Settled</span>`
          : isOwes
            ? `<span class="badge-pending">🔴 Owes ₹${Math.round(out).toLocaleString('en-IN')}</span>`
            : `<span class="badge-partial" style="background:rgba(26,115,232,0.1);color:var(--primary);border-color:rgba(26,115,232,.3)">💰 To receive</span>`
        }</td>
        <td><span class="badge-cat">${b.mealsCount || b.expenseCount || 0} meals</span></td>
        <td style="min-width:130px">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-custom" style="flex:1">
              <div class="progress-fill ${isOwes ? 'danger' : ''}" style="width:${barPct}%;background:${isOwes?'var(--danger)':'var(--primary)'}"></div>
            </div>
            <span style="font-size:11px;color:var(--text-muted)">${barPct}%</span>
          </div>
        </td>
        <td>
          ${isOwes && !isSettled ? `
            <button class="btn-success-custom" style="padding:4px 10px;font-size:12px;display:flex;align-items:center;gap:4px" onclick="openPayUpiQrModal('${b.userid}', '${b.name}', '192472374', 'Jagan', ${Math.round(out)})">
              <i class="fas fa-qrcode"></i> Pay ₹${Math.round(out)}
            </button>
          ` : isSettled ? `
            <span style="font-size:12px;color:var(--secondary);font-weight:600"><i class="fas fa-check-circle me-1"></i>Settled</span>
          ` : `
            <span style="font-size:12px;color:var(--primary);font-weight:700;background:rgba(26,115,232,0.1);padding:4px 10px;border-radius:12px;border:1px solid rgba(26,115,232,0.3)"><i class="fas fa-hand-holding-usd me-1"></i>To Collect</span>
          `}
        </td>
      </tr>`;
    }).join('');

    // ─── Totals footer ────────────────────────────────
    if (App.isAdmin) {
      tbody.innerHTML += `
        <tr style="background:var(--bg-2);font-weight:700">
          <td>TOTAL</td>
          <td style="color:var(--primary)">₹${totalExpenses.toLocaleString('en-IN')}</td>
          <td>₹${Math.round(perPersonShare * balances.length).toLocaleString('en-IN')}</td>
          <td colspan="5" style="color:var(--text-muted);font-size:13px">
            ${balances.length} Members Registered
          </td>
        </tr>`;
    }

    // ─── Settlements ──────────────────────────────────
    const visibleSettlements = App.isAdmin
      ? settlements
      : settlements.filter(s => s.fromMemberId === me?.userid || s.toMemberId === me?.userid);

    renderSettlements(visibleSettlements);

    // ─── Load Admin Credentials Directory ──────────────
    if (App.isAdmin) {
      loadAdminCredentialsDirectory();
    }
  } catch (err) {
    console.error('Error loading members page:', err);
    const errorHtml = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load data. Please refresh the page.</div>`;
    document.getElementById('memberCards').innerHTML = errorHtml;
  }
}

async function loadAdminCredentialsDirectory() {
  const credBody = document.getElementById('adminCredentialsTableBody');
  if (!credBody) return;
  const res = await api('/api/members/credentials');
  if (res && res.success && Array.isArray(res.data)) {
    credBody.innerHTML = res.data.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar ${avatarClass(u.shortName || u.name)}">${u.avatar || '👤'}</div>
            <div>
              <div style="font-weight:700;color:var(--text-primary)">${u.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${u.email || '-'}</div>
            </div>
          </div>
        </td>
        <td>
          <code style="background:rgba(26,115,232,0.1);color:var(--primary);padding:4px 8px;border-radius:6px;font-weight:700;font-size:14px">${u.userid}</code>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="password" readonly value="${u.password || ''}" id="pwdInput_${u.userid}" class="form-control-custom" style="width:140px;padding:4px 8px;font-size:13px;font-family:monospace;background:rgba(255,255,255,0.05)" />
            <button type="button" class="btn-ghost" style="padding:4px 8px;font-size:12px;color:var(--primary)" onclick="togglePasswordView('${u.userid}')" title="Show/Hide Password">
              <i class="fas fa-eye" id="eyeIcon_${u.userid}"></i>
            </button>
          </div>
        </td>
        <td>
          ${u.role === 'admin' 
            ? '<span class="badge bg-danger">👑 Administrator</span>' 
            : '<span class="badge bg-secondary">👤 Member</span>'}
        </td>
        <td style="font-size:12px;color:var(--text-muted)">${formatDate(u.joinDate)}</td>
        <td>
          <button class="btn-primary-custom" style="padding:4px 10px;font-size:12px" onclick="openResetPasswordModal('${u.userid}', '${u.name}')">
            <i class="fas fa-key me-1"></i>Reset Password
          </button>
        </td>
      </tr>
    `).join('');
  } else {
    credBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No member accounts found.</td></tr>`;
  }
}

function togglePasswordView(userid) {
  const pwdInput = document.getElementById(`pwdInput_${userid}`);
  const eyeIcon = document.getElementById(`eyeIcon_${userid}`);
  if (pwdInput) {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (eyeIcon) eyeIcon.className = 'fas fa-eye-slash';
    } else {
      pwdInput.type = 'password';
      if (eyeIcon) eyeIcon.className = 'fas fa-eye';
    }
  }
}

function openResetPasswordModal(userid, name) {
  let modal = document.getElementById('resetPasswordModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'resetPasswordModal';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="background:var(--surface);border:1px solid var(--glass-border);border-radius:16px">
          <div class="modal-header">
            <h5 class="modal-title" style="font-size:16px"><i class="fas fa-key me-2 text-warning"></i>Reset Password</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
              Setting new password for <strong id="resetTargetName"></strong> (<code id="resetTargetUserid"></code>):
            </div>
            <input type="password" class="form-control-custom" id="resetNewPwd" placeholder="Enter new password" required />
          </div>
          <div class="modal-footer gap-2">
            <button class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
            <button class="btn-primary-custom" onclick="submitResetPassword()"><i class="fas fa-save me-1"></i>Save Password</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('resetTargetName').textContent = name;
  document.getElementById('resetTargetUserid').textContent = userid;
  document.getElementById('resetNewPwd').value = '';
  window.activeResetUserid = userid;
  new bootstrap.Modal(modal).show();
}

async function submitResetPassword() {
  const userid = window.activeResetUserid;
  const newPassword = document.getElementById('resetNewPwd').value.trim();
  if (!userid || !newPassword) {
    showToast('Required', 'Please enter a new password.', 'error');
    return;
  }

  showLoader();
  const res = await api('/api/members/reset-password', {
    method: 'POST',
    body: JSON.stringify({ userid, newPassword })
  });
  hideLoader();

  const modalEl = document.getElementById('resetPasswordModal');
  if (modalEl) {
    const instance = bootstrap.Modal.getInstance(modalEl);
    if (instance) instance.hide();
  }

  if (res && res.success) {
    showToast('Password Updated! 🔑', res.message, 'success');
    loadAdminCredentialsDirectory();
  } else {
    showToast('Error', res?.message || 'Failed to update password.', 'error');
  }
}

function renderSettlements(settlements) {
  const el = document.getElementById('settlementList');
  if (!settlements || settlements.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">No settlements yet</div><div class="empty-desc">Record a cash payment when someone settles their share.</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-responsive">
      <table class="custom-table">
        <thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount Paid</th><th>Notes</th>${App.isAdmin ? '<th>Action</th>' : ''}</tr></thead>
        <tbody>
          ${settlements.map(s => `
            <tr>
              <td style="color:var(--text-muted);font-size:13px">${formatDate(s.date)}</td>
              <td><div style="display:flex;align-items:center;gap:8px">
                <div class="avatar ${avatarClass(s.fromMemberName)}" style="width:30px;height:30px;border-radius:8px;font-size:11px">${(s.fromMemberName || '').substring(0,2).toUpperCase()}</div>
                ${s.fromMemberName}
              </div></td>
              <td><div style="display:flex;align-items:center;gap:8px">
                <div class="avatar ${avatarClass(s.toMemberName)}" style="width:30px;height:30px;border-radius:8px;font-size:11px">${(s.toMemberName || '').substring(0,2).toUpperCase()}</div>
                ${s.toMemberName}
              </div></td>
              <td><strong style="color:var(--secondary)">₹${(s.amount || 0).toLocaleString('en-IN')}</strong></td>
              <td style="color:var(--text-muted);font-size:13px">${s.notes || '-'}</td>
              ${App.isAdmin ? `<td><button class="btn-danger-custom" style="padding:5px 10px;font-size:12px" onclick="deleteSettlement('${s.id}')"><i class="fas fa-trash"></i></button></td>` : ''}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── Add Member Modal Controller ──────────────────
function openAddMemberModal() {
  document.getElementById('addMemberForm').reset();
  const modal = new bootstrap.Modal(document.getElementById('addMemberModal'));
  modal.show();
}

async function submitAddMember() {
  const userid  = document.getElementById('newMemberUserid').value.trim();
  const name    = document.getElementById('newMemberName').value.trim();
  const password = document.getElementById('newMemberPassword').value.trim();
  const role    = document.getElementById('newMemberRole').value;
  const email   = document.getElementById('newMemberEmail').value.trim();

  if (!userid || !name || !password) {
    showToast('Required Fields', 'User ID, Full Name, and Password are required.', 'error');
    return;
  }

  showLoader();
  const res = await api('/api/members', {
    method: 'POST',
    body: JSON.stringify({ userid, name, password, role, email })
  });
  hideLoader();

  const modalEl = document.getElementById('addMemberModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();

  if (res && res.success) {
    showToast('Member Created 👤', res.message, 'success');
    if (typeof triggerPushNotification === 'function') {
      triggerPushNotification('Curry Tracker 👤', `New Member Account Created: ${name} (${userid})`);
    }
    loadMembers();
  } else {
    showToast('Error', res?.message || 'Failed to add member.', 'error');
  }
}

// ─── Settlement Modal ──────────────────────────────
function openSettleModal() {
  let modal = document.getElementById('settleModal');
  const members = window.currentBalances || [];

  const memberOpts = members.map(m => `<option value="${m.userid}" data-name="${m.name}">${m.name} (${m.userid})</option>`).join('');

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'settleModal';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-handshake me-2 text-success"></i>Record Settlement Payment</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div style="background:rgba(26,115,232,0.06);border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
              <i class="fas fa-info-circle me-1 text-primary"></i>
              Record a cash payment made between members to settle their share.
            </div>
            <div class="mb-3">
              <label class="form-label-custom">Who Paid (From) *</label>
              <select class="form-control-custom" id="settleFrom">
                <option value="">-- Select Member --</option>
                ${memberOpts}
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label-custom">Paid To (To) *</label>
              <select class="form-control-custom" id="settleTo">
                <option value="">-- Select Member --</option>
                ${memberOpts}
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label-custom">Amount (₹) *</label>
              <input type="number" class="form-control-custom" id="settleAmount" min="1" step="0.01" placeholder="e.g. 250" />
            </div>
            <div class="mb-3">
              <label class="form-label-custom">Date</label>
              <input type="date" class="form-control-custom" id="settleDate" />
            </div>
            <div class="mb-3">
              <label class="form-label-custom">Notes</label>
              <input type="text" class="form-control-custom" id="settleNotes" placeholder="e.g. Cash payment via GPay/PhonePe" />
            </div>
          </div>
          <div class="modal-footer gap-2">
            <button class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
            <button class="btn-success-custom" onclick="submitSettlement()"><i class="fas fa-check me-1"></i>Record Settlement</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } else {
    document.getElementById('settleFrom').innerHTML = `<option value="">-- Select Member --</option>` + memberOpts;
    document.getElementById('settleTo').innerHTML   = `<option value="">-- Select Member --</option>` + memberOpts;
  }
  document.getElementById('settleDate').value = new Date().toISOString().split('T')[0];
  new bootstrap.Modal(modal).show();
}

async function submitSettlement() {
  const fromEl = document.getElementById('settleFrom');
  const toEl   = document.getElementById('settleTo');
  const fromMemberId   = fromEl.value;
  const fromMemberName = fromEl.options[fromEl.selectedIndex]?.text.split(' (')[0] || '';
  const toMemberId     = toEl.value;
  const toMemberName   = toEl.options[toEl.selectedIndex]?.text.split(' (')[0] || '';
  const amount         = document.getElementById('settleAmount').value;
  const date           = document.getElementById('settleDate').value;
  const notes          = document.getElementById('settleNotes').value;

  if (!fromMemberId || !toMemberId || !amount) {
    showToast('Missing Fields', 'Please fill From, To and Amount.', 'error');
    return;
  }
  if (fromMemberId === toMemberId) {
    showToast('Invalid', 'From and To cannot be the same member.', 'error');
    return;
  }

  showLoader();
  const res = await api('/api/balance/settle', {
    method: 'POST',
    body: JSON.stringify({ fromMemberId, fromMemberName, toMemberId, toMemberName, amount: parseFloat(amount), date, notes }),
  });
  hideLoader();

  const modalInstance = bootstrap.Modal.getInstance(document.getElementById('settleModal'));
  if (modalInstance) modalInstance.hide();

  if (res && res.success) {
    showToast('Settlement Recorded 🤝', `${fromMemberName} paid ₹${parseFloat(amount).toLocaleString('en-IN')} to ${toMemberName}`, 'success');
    loadMembers();
  } else {
    showToast('Error', res?.message || 'Failed to record settlement.', 'error');
  }
}

async function deleteSettlement(id) {
  if (!confirm('Delete this settlement record?')) return;
  showLoader();
  const res = await api(`/api/balance/settle/${id}`, { method: 'DELETE' });
  hideLoader();

  if (res && res.success) {
    showToast('Deleted', 'Settlement removed.', 'success');
    loadMembers();
  }
}

async function quickSettleFull(fromMemberId, fromMemberName, toMemberId, toMemberName, amount) {
  if (!confirm(`Mark ${fromMemberName}'s balance of ₹${amount} as FULLY PAID & SETTLED?`)) return;
  showLoader();
  const res = await api('/api/balance/settle', {
    method: 'POST',
    body: JSON.stringify({
      fromMemberId,
      fromMemberName,
      toMemberId,
      toMemberName,
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0],
      notes: 'Full Settlement (Cleared Balance)'
    })
  });
  hideLoader();

  if (res && res.success) {
    showToast('Balance Fully Cleared! 🎉', `${fromMemberName}'s balance is now ₹0 (Fully Settled).`, 'success');
    loadMembers();
  } else {
    showToast('Error', res?.message || 'Failed to clear balance.', 'error');
  }
}

window.loadMembers = loadMembers;

function openCreateAdminModal() {
  const modal = new bootstrap.Modal(document.getElementById('createAdminModal'));
  modal.show();
}

async function submitCreateGroupAdmin() {
  const name = document.getElementById('newAdminName')?.value.trim();
  const userid = document.getElementById('newAdminUserid')?.value.trim();
  const password = document.getElementById('newAdminPassword')?.value.trim();
  const email = document.getElementById('newAdminEmail')?.value.trim();
  const groupName = document.getElementById('newAdminGroupName')?.value.trim();

  if (!name || !userid || !password) {
    showToast('Missing Fields', 'Admin Full Name, User ID, and Password are required', 'warning');
    return;
  }

  showLoader();
  const res = await api('/api/members/create-admin', {
    method: 'POST',
    body: JSON.stringify({ name, userid, password, email, groupName })
  });
  hideLoader();

  if (res && res.success) {
    showToast('Group Admin Created! 👑', `Admin account ${name} (${userid}) created successfully.`, 'success', 4000);
    const modalEl = document.getElementById('createAdminModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    document.getElementById('createAdminForm').reset();
    loadMembers();
  } else {
    showToast('Error Creating Admin', res?.message || 'Failed to create group admin', 'error');
  }
}

window.openCreateAdminModal = openCreateAdminModal;
window.submitCreateGroupAdmin = submitCreateGroupAdmin;
