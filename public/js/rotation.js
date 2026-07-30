/**
 * rotation.js – Daily Payer Rotation & Turn Tracker View
 * Tracks 4-person / room daily payer rotation (Person 1 -> 2 -> 3 -> 4 -> Repeats)
 * Includes customization of members and sequence order.
 */

let cachedAllMembers = [];
let tempSequence = [];

window.loadRotationView = async function loadRotationView() {
  const content = document.getElementById('viewContent');
  if (!content) return;

  content.innerHTML = `
    <div id="view-rotation" class="view-section" style="animation:fadeInUp 0.4s ease">
      
      <!-- ══ Hero Banner: Today's Designated Payer ══ -->
      <div class="glass-card mb-4" style="background:linear-gradient(135deg,rgba(26,115,232,0.12),rgba(52,168,83,0.12));border:1px solid rgba(26,115,232,0.3);position:relative;overflow:hidden">
        <div class="card-body-custom" style="padding:24px">
          <div class="row align-items-center g-3">
            <div class="col-md-7">
              <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(26,115,232,0.15);color:var(--primary);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:10px">
                <i class="fas fa-sync-alt fa-spin"></i> DAILY PAYER ROTATION ACTIVE
              </div>
              <h2 style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:6px" id="rotCurrentHeroTitle">
                Today's Designated Payer: <span id="rotCurrentPayerName" style="color:var(--primary)">Loading...</span>
              </h2>
              <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:16px">
                Daily spending rotates sequentially (Person 1 ➔ Person 2 ➔ Person 3 ➔ Person 4). When today's payer pays, click below to mark turn complete and pass to the next person!
              </p>
              
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button onclick="openCompleteTurnModal()" class="btn-success-custom" style="padding:10px 20px;font-size:14px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;font-weight:700">
                  <i class="fas fa-check-circle"></i> I Paid Today (Pass Turn ➔)
                </button>
                <button onclick="openCustomizeSequenceModal()" class="btn-primary-custom" style="padding:10px 16px;font-size:13px;border-radius:12px;display:inline-flex;align-items:center;gap:6px">
                  <i class="fas fa-sliders-h"></i> Customize Sequence
                </button>
                <button onclick="skipRotationTurn()" class="btn-outline-custom" style="padding:10px 16px;font-size:13px;border-radius:12px;display:inline-flex;align-items:center;gap:6px">
                  <i class="fas fa-forward"></i> Skip Turn
                </button>
              </div>
            </div>

            <!-- Next Up Preview Box -->
            <div class="col-md-5">
              <div style="background:var(--surface);border:1px solid var(--glass-border);border-radius:16px;padding:16px 20px;box-shadow:0 8px 24px rgba(0,0,0,0.06)">
                <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">
                  <i class="fas fa-calendar-day text-warning me-1"></i> Tomorrow's Turn
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <div id="rotNextAvatarBox" style="width:44px;height:44px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px">
                    ?
                  </div>
                  <div>
                    <div style="font-size:16px;font-weight:800;color:var(--text-primary)" id="rotNextPayerName">Loading...</div>
                    <div style="font-size:12px;color:var(--text-muted)">Up next after today's payment</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ Rotation Sequence Order Grid ══ -->
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <h3 style="font-size:18px;font-weight:800;color:var(--text-primary);margin:0">
            <i class="fas fa-list-ol text-primary me-2"></i>Payer Rotation Order (1 ➔ 2 ➔ 3 ➔ 4)
          </h3>
          <button onclick="openCustomizeSequenceModal()" class="btn-sm btn-outline-primary" style="font-size:12px;padding:4px 10px;border-radius:8px">
            <i class="fas fa-cog me-1"></i>Re-order / Customize Users
          </button>
        </div>
        <div class="row g-3" id="rotationSequenceCards">
          <div class="col-12 text-center" style="padding:30px;color:var(--text-muted)">
            <div class="loader-spinner" style="margin:0 auto 12px"></div>Loading rotation sequence...
          </div>
        </div>
      </div>

      <!-- ══ Rotation Logs History ══ -->
      <div class="glass-card">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-history"></i></div>
            Rotation Payment History Log
          </h3>
          <div style="font-size:12px;color:var(--text-muted)">Track of all sequential daily payments</div>
        </div>
        <div class="table-responsive" id="rotationHistoryTable">
          <div style="padding:32px;text-align:center;color:var(--text-muted)">Loading rotation history...</div>
        </div>
      </div>

    </div>

    <!-- Complete Turn Modal -->
    <div class="modal fade" id="completeTurnModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content glass-card">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-header-title">
              <i class="fas fa-sync-alt text-success me-2"></i>Mark Turn Complete & Pass Turn
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
              Record what was spent today. The system will automatically create the expense and pass the turn to the next person!
            </p>

            <div class="mb-3">
              <label class="form-label-custom">Amount Spent Today (₹)</label>
              <input type="number" id="rotTurnAmount" class="form-control-custom" placeholder="e.g. 150" required />
            </div>

            <div class="mb-3">
              <label class="form-label-custom">Item / Description</label>
              <input type="text" id="rotTurnItem" class="form-control-custom" placeholder="e.g. Daily Curry / Groceries" />
            </div>

            <div style="background:rgba(26,115,232,0.08);border:1px solid rgba(26,115,232,0.2);border-radius:10px;padding:12px;font-size:12px;color:var(--text-primary)">
              <i class="fas fa-info-circle text-primary me-1"></i>
              Passing turn will notify everyone on Telegram & Phone status bar!
            </div>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn-secondary-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="button" onclick="submitCompleteTurn()" class="btn-success-custom">
              <i class="fas fa-check me-1"></i> Submit & Pass Turn ➔
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Customize Sequence Modal -->
    <div class="modal fade" id="customizeSequenceModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content glass-card">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-header-title">
              <i class="fas fa-sliders-h text-primary me-2"></i>Customize Daily Payer Order & Users
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">
              Arrange the order in which members will pay each day (Person 1 ➔ Person 2 ➔ Person 3 ➔ Person 4). Use ▲ and ▼ to re-order!
            </p>

            <div id="customizeSeqList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
              <!-- Re-order list items injected here -->
            </div>

            <div class="form-check" style="font-size:13px">
              <input class="form-check-input" type="checkbox" id="resetRotationIndexCheck" />
              <label class="form-check-label" for="resetRotationIndexCheck">
                Reset current turn to Person 1 (Jagan) after saving
              </label>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn-secondary-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="button" onclick="saveCustomSequence()" class="btn-primary-custom">
              <i class="fas fa-save me-1"></i> Save Custom Sequence
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  await fetchRotationData();
};

// Fetch Rotation State from API
async function fetchRotationData() {
  const data = await api('/api/rotation');
  if (!data || !data.success) return;

  const current = data.currentPayer || {};
  const next = data.nextPayer || {};
  const sequence = data.sequence || [];
  const logs = data.logs || [];
  cachedAllMembers = data.allMembers || sequence;
  tempSequence = [...sequence];

  // Update Hero Card
  const curNameEl = document.getElementById('rotCurrentPayerName');
  if (curNameEl) curNameEl.textContent = current.name || 'Payer';

  const nextNameEl = document.getElementById('rotNextPayerName');
  if (nextNameEl) nextNameEl.textContent = next.name || 'Next Payer';

  const nextAvEl = document.getElementById('rotNextAvatarBox');
  if (nextAvEl) {
    const initials = (next.name || '?').substring(0, 2).toUpperCase();
    nextAvEl.textContent = initials;
  }

  // Render Sequence Cards
  const seqContainer = document.getElementById('rotationSequenceCards');
  if (seqContainer) {
    if (sequence.length === 0) {
      seqContainer.innerHTML = '<div class="col-12 text-center text-muted">No members in rotation.</div>';
    } else {
      seqContainer.innerHTML = sequence.map((m, idx) => {
        const isCurrent = m.isCurrentTurn;
        const isNext = m.isNextTurn;
        const initials = (m.name || '?').substring(0, 2).toUpperCase();
        const borderStyle = isCurrent 
          ? 'border:2px solid #34a853;box-shadow:0 8px 24px rgba(52,168,83,0.25);background:linear-gradient(135deg,rgba(52,168,83,0.1),var(--surface))' 
          : (isNext ? 'border:2px solid #1a73e8;background:linear-gradient(135deg,rgba(26,115,232,0.06),var(--surface))' : 'border:1px solid var(--glass-border)');

        const badgeHtml = isCurrent
          ? '<span class="badge bg-success" style="font-size:11px">🎯 Today\'s Payer</span>'
          : (isNext ? '<span class="badge bg-primary" style="font-size:11px">⏭️ Tomorrow</span>' : `<span class="badge bg-secondary" style="font-size:11px">Turn ${m.turnOrder}</span>`);

        const avatarHtml = (m.userid === '192472374' || m.role === 'admin')
          ? `<img src="/images/jagan.jpg?v=622" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)" onerror="this.outerHTML='<div class=avatar style=width:48px;height:48px;border-radius:50%>${initials}</div>'" />`
          : `<div class="avatar" style="width:48px;height:48px;border-radius:50%;font-size:16px;font-weight:700;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center">${initials}</div>`;

        return `
          <div class="col-xl-3 col-md-6">
            <div class="glass-card" style="padding:18px;${borderStyle};position:relative">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <div style="font-size:12px;font-weight:700;color:var(--text-muted)">Person ${m.turnOrder}</div>
                ${badgeHtml}
              </div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                ${avatarHtml}
                <div>
                  <div style="font-size:16px;font-weight:800;color:var(--text-primary)">${m.name}</div>
                  <div style="font-size:11px;color:var(--text-muted)">ID: ${m.userid}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--bg-2);padding:8px 12px;border-radius:10px;text-align:center">
                <div>
                  <div style="font-size:10px;color:var(--text-muted)">Turns Paid</div>
                  <div style="font-size:14px;font-weight:800;color:var(--primary)">${m.stats.turnsCount}</div>
                </div>
                <div>
                  <div style="font-size:10px;color:var(--text-muted)">Total Spent</div>
                  <div style="font-size:14px;font-weight:800;color:var(--text-primary)">₹${m.stats.totalAmount.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render History Table
  const tableContainer = document.getElementById('rotationHistoryTable');
  if (tableContainer) {
    if (logs.length === 0) {
      tableContainer.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text-muted)">
          <i class="fas fa-sync-alt" style="font-size:32px;margin-bottom:10px;display:block;opacity:0.3"></i>
          No rotation turns recorded yet. Click <strong>"I Paid Today"</strong> to log the first turn!
        </div>
      `;
    } else {
      tableContainer.innerHTML = `
        <table class="table table-hover align-middle mb-0" style="font-size:13.5px">
          <thead style="background:var(--bg-2);color:var(--text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:0.5px">
            <tr>
              <th style="padding:12px 16px">Date</th>
              <th>Payer</th>
              <th>Item / Note</th>
              <th style="text-align:right;padding-right:16px">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td style="padding:12px 16px;font-family:monospace;color:var(--text-muted)">${l.date || l.createdAt.split('T')[0]}</td>
                <td><strong>${l.payerName}</strong></td>
                <td style="color:var(--text-secondary)">${l.item || 'Daily Rotation'}</td>
                <td style="text-align:right;padding-right:16px;font-weight:800;color:var(--primary)">₹${parseFloat(l.amount).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }
}

// Open Customize Modal
window.openCustomizeSequenceModal = function openCustomizeSequenceModal() {
  const container = document.getElementById('customizeSeqList');
  if (!container) return;

  renderSeqModalList();
  const modal = new bootstrap.Modal(document.getElementById('customizeSequenceModal'));
  modal.show();
};

function renderSeqModalList() {
  const container = document.getElementById('customizeSeqList');
  if (!container) return;

  container.innerHTML = tempSequence.map((m, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-2);padding:10px 14px;border-radius:10px;border:1px solid var(--glass-border)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px;font-weight:800;color:var(--primary);width:20px">#${idx + 1}</span>
        <div>
          <strong style="font-size:14px;color:var(--text-primary)">${m.name}</strong>
          <span style="font-size:11px;color:var(--text-muted);margin-left:6px">ID: ${m.userid}</span>
        </div>
      </div>
      <div style="display:flex;gap:4px">
        <button onclick="moveSeqMember(${idx}, -1)" class="btn btn-sm btn-outline-secondary" ${idx === 0 ? 'disabled' : ''} style="padding:2px 8px">▲</button>
        <button onclick="moveSeqMember(${idx}, 1)" class="btn btn-sm btn-outline-secondary" ${idx === tempSequence.length - 1 ? 'disabled' : ''} style="padding:2px 8px">▼</button>
      </div>
    </div>
  `).join('');
}

window.moveSeqMember = function moveSeqMember(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= tempSequence.length) return;
  const temp = tempSequence[index];
  tempSequence[index] = tempSequence[target];
  tempSequence[target] = temp;
  renderSeqModalList();
};

window.saveCustomSequence = async function saveCustomSequence() {
  const customSequence = tempSequence.map(m => m.userid);
  const resetCheck = document.getElementById('resetRotationIndexCheck');
  const resetIndex = resetCheck ? resetCheck.checked : false;

  showLoader();
  const res = await api('/api/rotation/update-sequence', {
    method: 'POST',
    body: JSON.stringify({ customSequence, resetIndex })
  });
  hideLoader();

  if (res && res.success) {
    const modalEl = document.getElementById('customizeSequenceModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    showToast('Sequence Updated! ⚙️', res.message, 'success');
    fetchRotationData();
  } else {
    showToast('Error', res?.message || 'Failed to update sequence.', 'error');
  }
};

// Open Complete Turn Modal
window.openCompleteTurnModal = function openCompleteTurnModal() {
  const modal = new bootstrap.Modal(document.getElementById('completeTurnModal'));
  modal.show();
};

// Submit Completed Turn
window.submitCompleteTurn = async function submitCompleteTurn() {
  const amtEl = document.getElementById('rotTurnAmount');
  const itemEl = document.getElementById('rotTurnItem');
  if (!amtEl) return;

  const amount = parseFloat(amtEl.value);
  const item = itemEl ? itemEl.value.trim() : '';

  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount spent today.', 'warning');
    return;
  }

  showLoader();
  const res = await api('/api/rotation/complete-turn', {
    method: 'POST',
    body: JSON.stringify({ amount, item })
  });
  hideLoader();

  if (res && res.success) {
    const modalEl = document.getElementById('completeTurnModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    showToast('Turn Completed & Passed! 🔄', res.message, 'success');
    amtEl.value = '';
    if (itemEl) itemEl.value = '';

    fetchRotationData();
  } else {
    showToast('Error', res?.message || 'Failed to complete turn: ' + (res?.message || ''), 'error');
  }
};

// Skip Turn
window.skipRotationTurn = async function skipRotationTurn() {
  if (!confirm('Skip current person\'s turn and pass to next person?')) return;
  showLoader();
  const res = await api('/api/rotation/skip-turn', { method: 'POST' });
  hideLoader();

  if (res && res.success) {
    showToast('Turn Skipped ⏩', res.message, 'info');
    fetchRotationData();
  } else {
    showToast('Error', res?.message || 'Failed to skip turn.', 'error');
  }
};
