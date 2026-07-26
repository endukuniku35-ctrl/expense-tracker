/**
 * payments.js – Live Payment Status & Settlement Tracker
 */

async function loadPayments() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <!-- Summary -->
      <div class="row g-3 mb-4" id="paymentTopCards">
        <div class="col-12 text-center" style="padding:20px;color:var(--text-muted)">
          <div class="loader-spinner" style="margin:0 auto 12px"></div>Loading payment statistics...
        </div>
      </div>

      <!-- Per-Meal Breakdown -->
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-utensils"></i></div>
            Per-Meal Split Breakdown
          </h3>
          <div style="font-size:12px;color:var(--text-muted)">Live equal split ÷ participating members</div>
        </div>
        <div class="table-responsive" id="mealBreakdownTable">
          <div style="padding:32px;text-align:center;color:var(--text-muted)">Loading...</div>
        </div>
      </div>

      <!-- Balance Summary Cards -->
      <div class="row g-3 mb-4" id="balanceCards">
        <div class="col-12 text-center" style="padding:20px;color:var(--text-muted)">
          <div class="loader-spinner" style="margin:0 auto 12px"></div>
        </div>
      </div>

      <!-- Settlement Record Section -->
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-handshake"></i></div>Record / Submit a Payment Settlement</h3>
        </div>
        <div class="card-body-custom">
          <div class="row g-3 align-items-end">
            <div class="col-md-2">
              <label class="form-label-custom">From (Payer)</label>
              <select class="form-control-custom" id="qsFrom">
                <option value="">-- Who Pays --</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label-custom">To (Receiver)</label>
              <select class="form-control-custom" id="qsTo">
                <option value="">-- Who Receives --</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label-custom">Amount (₹)</label>
              <input type="number" class="form-control-custom" id="qsAmount" placeholder="e.g. 500" min="1" />
            </div>
            <div class="col-md-2">
              <label class="form-label-custom">Date</label>
              <input type="date" class="form-control-custom" id="qsDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="col-md-2">
              <label class="form-label-custom">Notes</label>
              <input type="text" class="form-control-custom" id="qsNotes" placeholder="e.g. Cash / PhonePe" />
            </div>
            <div class="col-md-2">
              <button class="btn-success-custom" onclick="quickSettle()" style="width:100%;padding:10px">
                <i class="fas fa-check me-1"></i>Record Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Settlement Transaction Log -->
      <div class="glass-card">
        <div class="card-header-custom">
          <h3 class="card-title-custom"><div class="card-title-icon"><i class="fas fa-history"></i></div>Payment & Settlement Transactions Log</h3>
        </div>
        <div id="paymentHistoryLog">
          <div style="padding:32px;text-align:center;color:var(--text-muted)">Loading...</div>
        </div>
      </div>
    </div>`;

  const data = await api('/api/balance');
  if (!data) return;

  const { balances, totalExpenses, perPersonShare, settlements } = data;

  // Populate quick settle select dropdowns
  const opts = balances.map(b => `<option value="${b.userid}">${b.name}</option>`).join('');
  const fromEl = document.getElementById('qsFrom');
  const toEl = document.getElementById('qsTo');
  if (fromEl) fromEl.innerHTML = `<option value="">-- Who Pays --</option>` + opts;
  if (toEl) toEl.innerHTML = `<option value="">-- Who Receives --</option>` + opts;

  // ─── Top Summary Cards ────────────────────────────
  const totalOwed     = balances.filter(b => b.netBalance < 0).reduce((s, b) => s + b.outstanding, 0);
  const totalReceive  = balances.filter(b => b.netBalance > 0).reduce((s, b) => s + b.outstanding, 0);
  const topCards = document.getElementById('paymentTopCards');
  topCards.innerHTML = `
    <div class="col-md-3">
      <div class="stat-card blue"><div class="stat-icon blue"><i class="fas fa-utensils"></i></div>
        <div class="stat-label">Total Curry Bills</div>
        <div class="stat-value" id="ptTotal">₹0</div>
        <div class="stat-change neutral"><i class="fas fa-receipt"></i> ${balances.reduce((s,b)=>s+b.expenseCount,0)} meals</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-divide"></i></div>
        <div class="stat-label">Average Per Person Share</div>
        <div class="stat-value" id="ptShare">₹0</div>
        <div class="stat-change neutral"><i class="fas fa-users"></i> ÷ ${balances.length} members</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div>
        <div class="stat-label">Still Owed</div>
        <div class="stat-value" id="ptOwed">₹0</div>
        <div class="stat-change neutral"><i class="fas fa-clock"></i> Pending settlements</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-check-double"></i></div>
        <div class="stat-label">To Be Received</div>
        <div class="stat-value" id="ptReceive">₹0</div>
        <div class="stat-change neutral"><i class="fas fa-handshake"></i> Outstanding credit</div>
      </div>
    </div>`;

  animateCounter(document.getElementById('ptTotal'),   totalExpenses,    '₹');
  animateCounter(document.getElementById('ptShare'),   Math.round(perPersonShare), '₹');
  animateCounter(document.getElementById('ptOwed'),    Math.round(totalOwed),  '₹');
  animateCounter(document.getElementById('ptReceive'), Math.round(totalReceive), '₹');

  // ─── Per-Meal Breakdown Table ─────────────────────
  const expenses = (await api('/api/expenses/all'))?.data || [];
  const mealEl = document.getElementById('mealBreakdownTable');
  if (expenses.length === 0) {
    mealEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-title">No meals recorded yet</div></div>`;
  } else {
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    mealEl.innerHTML = `
      <table class="custom-table">
        <thead><tr>
          <th>Date</th><th>Meal</th><th>Total Bill</th><th>Paid By</th>
          ${balances.map(b => `<th style="text-align:center">${b.shortName}'s Share</th>`).join('')}
        </tr></thead>
        <tbody>
          ${sorted.map(e => {
            const splitList = (Array.isArray(e.splitBetween) && e.splitBetween.length > 0) ? e.splitBetween : balances.map(b => b.userid);
            const count = splitList.length;
            const share = Math.round(e.amount / count);
            const paidById = e.paidBy;

            return `<tr>
              <td style="color:var(--text-muted);font-size:12px;white-space:nowrap">${formatDate(e.date)}</td>
              <td>
                <strong>${e.title}</strong>
                <div style="font-size:11px;color:var(--text-muted)">${e.category} (${count} members)</div>
              </td>
              <td><strong style="color:var(--primary)">₹${e.amount.toLocaleString('en-IN')}</strong></td>
              <td><div style="display:flex;align-items:center;gap:7px">
                <div class="avatar ${avatarClass(e.paidByName)}" style="width:26px;height:26px;border-radius:7px;font-size:10px">${e.paidByName.substring(0,2).toUpperCase()}</div>
                <span style="font-size:13px">${e.paidByName}</span>
              </div></td>
              ${balances.map(b => {
                const uid = b.userid;
                const joined = splitList.includes(uid);
                if (!joined) {
                  return `<td style="text-align:center;color:var(--text-muted);font-size:12px"><em>- (didn't join)</em></td>`;
                }
                return `<td style="text-align:center">
                  <span style="font-size:13px;font-weight:600;color:${uid === paidById ? 'var(--secondary)' : 'var(--danger)'}">
                    ₹${share.toLocaleString('en-IN')}
                  </span>
                  ${uid === paidById ? `<div style="font-size:10px;color:var(--secondary)">✅ paid</div>` : `<div style="font-size:10px;color:var(--danger)">owes</div>`}
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background:var(--bg-2);font-weight:700">
            <td colspan="2">TOTAL</td>
            <td style="color:var(--primary)">₹${totalExpenses.toLocaleString('en-IN')}</td>
            <td></td>
            ${balances.map(b => `<td style="text-align:center;color:var(--text-secondary)">₹${Math.round(b.totalShare).toLocaleString('en-IN')}</td>`).join('')}
          </tr>
        </tfoot>
      </table>`;
  }

  // ─── Balance Cards ────────────────────────────────
  const balEl = document.getElementById('balanceCards');
  balEl.innerHTML = balances.map((b, i) => {
    const totalPaid  = b.totalPaid || 0;
    const totalShare = b.totalShare || 0;
    const settledOut = b.settledOut || 0;
    const settledIn  = b.settledIn || 0;

    // Effective Net Balance after settlements
    const net = Math.round((totalPaid + settledOut) - (totalShare + settledIn));
    const out = Math.abs(net);
    const isOwes = net < 0;
    const isSettled = out <= 0;
    const pct = perPersonShare > 0 ? Math.min(100, Math.round(((totalPaid + settledOut) / perPersonShare) * 100)) : 0;

    return `<div class="col-xl-3 col-md-6">
      <div class="payment-card" style="animation-delay:${i*0.1}s">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="avatar ${avatarClass(b.shortName)}" style="width:46px;height:46px;border-radius:14px;font-size:16px">${b.avatar}</div>
            <div>
              <div style="font-weight:700;font-size:16px;color:var(--text-primary)">${b.shortName}</div>
              <div style="font-size:11px;color:var(--text-muted)">${b.expenseCount} meals paid</div>
            </div>
          </div>
          ${isSettled
            ? `<span class="badge-paid">✅ Settled</span>`
            : isOwes
              ? `<span class="badge-pending">🔴 Owes</span>`
              : `<span class="badge-partial" style="background:rgba(26,115,232,.1);color:var(--primary);border-color:rgba(26,115,232,.3)">💰 Credit</span>`
          }
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          <div style="background:var(--bg-2);border-radius:9px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">Bills Paid</div>
            <div style="font-size:15px;font-weight:700;color:var(--primary)">₹${b.totalPaid.toLocaleString('en-IN')}</div>
          </div>
          <div style="background:var(--bg-2);border-radius:9px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">Fair Share</div>
            <div style="font-size:15px;font-weight:700;color:var(--text-secondary)">₹${Math.round(b.totalShare).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style="background:${isOwes ? 'rgba(234,67,53,0.08)' : isSettled ? 'rgba(52,168,83,0.08)' : 'rgba(26,115,232,0.08)'};border-radius:10px;padding:12px;margin-bottom:14px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Net Balance</div>
          <div style="font-size:22px;font-weight:800;color:${isOwes ? 'var(--danger)' : isSettled ? 'var(--secondary)' : 'var(--primary)'}">
            ${net >= 0 ? '+' : ''}₹${Math.round(net).toLocaleString('en-IN')}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">
            ${isSettled ? 'All square! 🎉' : isOwes ? `Outstanding: ₹${Math.round(out).toLocaleString('en-IN')}` : `To collect: ₹${Math.round(out).toLocaleString('en-IN')}`}
          </div>
        </div>

        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <span style="color:var(--text-muted)">Paid ${pct}% of fair share</span>
          </div>
          <div class="progress-custom" style="height:9px">
            <div class="progress-fill ${pct < 50 ? 'danger' : pct < 100 ? 'warning' : ''}" style="width:${Math.min(pct, 100)}%"></div>
          </div>
        </div>

        ${isOwes && !isSettled ? `
          <button class="btn-success-custom w-100 mt-2" style="padding:8px 12px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:10px" onclick="openPayUpiQrModal('${b.userid}', '${b.name}', '192472374', 'Jagan', ${Math.round(b.outstanding)})">
            <i class="fas fa-qrcode"></i> Pay ₹${Math.round(b.outstanding).toLocaleString('en-IN')} via UPI QR
          </button>
        ` : ''}
      </div>
    </div>`;
  }).join('');

  // ─── Payment Transactions Log Table ───────────────
  const logEl = document.getElementById('paymentHistoryLog');
  if (!settlements || settlements.length === 0) {
    logEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">No payment settlements recorded yet</div><div class="empty-desc">When a member pays cash to settle their share, record it above.</div></div>`;
  } else {
    logEl.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr><th>Date</th><th>From (Payer)</th><th>To (Receiver)</th><th>Amount Paid</th><th>Notes</th>${App.isAdmin ? '<th>Action</th>' : ''}</tr></thead>
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
                ${App.isAdmin ? `<td><button class="btn-danger-custom" style="padding:5px 10px;font-size:12px" onclick="deleteSettlementInLog('${s.id}')"><i class="fas fa-trash"></i></button></td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
}

// ─── Quick Settle ──────────────────────────────────
async function quickSettle() {
  const fromEl = document.getElementById('qsFrom');
  const toEl   = document.getElementById('qsTo');
  const fromMemberId   = fromEl.value;
  const fromMemberName = fromEl.options[fromEl.selectedIndex]?.text || '';
  const toMemberId     = toEl.value;
  const toMemberName   = toEl.options[toEl.selectedIndex]?.text || '';
  const amount  = document.getElementById('qsAmount').value;
  const date    = document.getElementById('qsDate').value;
  const notes   = document.getElementById('qsNotes').value;

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

  if (res && res.success) {
    showToast('Payment Settlement Recorded ✅', `${fromMemberName} paid ₹${parseFloat(amount).toLocaleString('en-IN')} to ${toMemberName}`, 'success');
    fromEl.value = ''; toEl.value = '';
    document.getElementById('qsAmount').value = '';
    document.getElementById('qsNotes').value  = '';
    loadPayments();
  } else {
    showToast('Error', res?.message || 'Failed to record settlement.', 'error');
  }
}

async function deleteSettlementInLog(id) {
  if (!confirm('Delete this settlement transaction?')) return;
  showLoader();
  const res = await api(`/api/balance/settle/${id}`, { method: 'DELETE' });
  hideLoader();

  if (res && res.success) {
    showToast('Deleted', 'Settlement removed.', 'success');
    loadPayments();
  }
}
