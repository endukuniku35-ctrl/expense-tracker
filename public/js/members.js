/**
 * members.js – Dynamic Members View & Add Member Controller
 */

async function loadMembers() {
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
                When one person pays the full bill, participating members owe their share back. 
                <strong>Net Balance</strong> shows who owes whom.
              </div>
            </div>
            <div style="margin-left:auto;display:flex;gap:10px;align-items:center">
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
              <th>Bills Paid <small style="opacity:.6">(as payer)</small></th>
              <th>Total Fair Share</th>
              <th>Net Balance</th>
              <th>Status</th>
              <th>Meals Count</th>
              <th>Balance Bar</th>
            </tr></thead>
            <tbody id="memberTableBody">
              <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Loading...</td></tr>
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

    // ─── Member Cards ─────────────────────────────────
    const cardsEl = document.getElementById('memberCards');
    cardsEl.innerHTML = balances.map((b, i) => {
      const net = b.netBalance || 0;
      const out = b.outstanding || 0;
      const isOwes = net < 0;
      const isSettled = out <= 0;
      const totalPaid = b.totalPaid || 0;
      const totalShare = b.totalShare || 0;
      const pct = totalShare > 0 ? Math.min(100, Math.round((totalPaid / totalShare) * 100)) : 0;
      const accentColor = isSettled ? '#34a853' : isOwes ? '#ea4335' : '#1a73e8';

      return `
        <div class="col-xl-3 col-md-6">
          <div class="payment-card" style="animation-delay:${i*0.1}s;border-top:3px solid ${accentColor}">
            <!-- Avatar + name -->
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
              <div class="avatar ${avatarClass(b.shortName || b.name)}" style="width:56px;height:56px;border-radius:16px;font-size:20px">${b.avatar || '👤'}</div>
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
              <div style="background:var(--bg-2);border-radius:10px;padding:12px;text-align:center">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">Net Balance</div>
                <div style="font-size:17px;font-weight:800;color:${accentColor}">
                  ${net >= 0 ? '+' : ''}₹${Math.round(net).toLocaleString('en-IN')}
                </div>
              </div>
              <div style="background:var(--bg-2);border-radius:10px;padding:12px;text-align:center">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">Outstanding</div>
                <div style="font-size:17px;font-weight:800;color:${isSettled ? '#34a853' : accentColor}">
                  ${isSettled ? '₹0' : '₹' + Math.round(out).toLocaleString('en-IN')}
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

            <!-- Status badge -->
            <div style="display:flex;justify-content:space-between;align-items:center">
              ${isSettled
                ? `<span class="badge-paid">✅ Settled</span>`
                : isOwes
                  ? `<span class="badge-pending">🔴 Owes ₹${Math.round(out).toLocaleString('en-IN')}</span>`
                  : `<span style="background:rgba(26,115,232,0.12);color:var(--primary);border:1px solid rgba(26,115,232,0.3);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">💰 Receive ₹${Math.round(out).toLocaleString('en-IN')}</span>`
              }
              <span style="font-size:12px;color:var(--text-muted)">${b.expenseCount || 0} meals paid</span>
            </div>
          </div>
        </div>`;
    }).join('');

    // ─── Table ────────────────────────────────────────
    const tbody = document.getElementById('memberTableBody');
    tbody.innerHTML = balances.map(b => {
      const net = b.netBalance || 0;
      const out = b.outstanding || 0;
      const isOwes = net < 0;
      const isSettled = out <= 0;
      const maxAbs = Math.max(...balances.map(x => Math.abs(x.netBalance || 0)), 1);
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
            ${net >= 0 ? '+' : ''}₹${Math.round(net).toLocaleString('en-IN')}
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
      </tr>`;
    }).join('');

    // ─── Totals footer ────────────────────────────────
    tbody.innerHTML += `
      <tr style="background:var(--bg-2);font-weight:700">
        <td>TOTAL</td>
        <td style="color:var(--primary)">₹${totalExpenses.toLocaleString('en-IN')}</td>
        <td>₹${Math.round(perPersonShare * balances.length).toLocaleString('en-IN')}</td>
        <td colspan="4" style="color:var(--text-muted);font-size:13px">
          ${balances.length} Members Registered
        </td>
      </tr>`;

    // ─── Settlements ──────────────────────────────────
    renderSettlements(settlements);
  } catch (err) {
    console.error('Error loading members page:', err);
    const errorHtml = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load data. Please refresh the page.</div>`;
    document.getElementById('memberCards').innerHTML = errorHtml;
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
