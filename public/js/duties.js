/**
 * duties.js – Item Duty & Task Assignment View
 * Assign specific item/household duties to members with admin controls.
 */

let cachedDutyMembers = [];

window.loadDutiesView = async function loadDutiesView() {
  const content = document.getElementById('viewContent');
  if (!content) return;

  content.innerHTML = `
    <div id="view-duties" class="view-section" style="animation:fadeInUp 0.4s ease">
      
      <!-- ══ Hero Banner ══ -->
      <div class="glass-card mb-4" style="background:linear-gradient(135deg,rgba(255,186,10,0.12),rgba(26,115,232,0.12));border:1px solid rgba(255,186,10,0.3)">
        <div class="card-body-custom" style="padding:24px">
          <div class="row align-items-center g-3">
            <div class="col-md-8">
              <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,186,10,0.18);color:var(--text-primary);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:10px">
                <i class="fas fa-tasks"></i> ITEM DUTY ASSIGNMENT MANAGER
              </div>
              <h2 style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:6px">
                Assign & Track Member Duties
              </h2>
              <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:16px">
                Assign specific duties (Curry, Rice, Groceries, Water, Gas, Cleaning) to members. Assigned members get instant Telegram & Status bar push alerts!
              </p>
              
              <button onclick="openAssignDutyModal()" class="btn-primary-custom" style="padding:10px 20px;font-size:14px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;font-weight:700">
                <i class="fas fa-plus-circle"></i> Assign New Duty / Item
              </button>
            </div>
            
            <div class="col-md-4 text-center">
              <div style="background:var(--surface);border:1px solid var(--glass-border);border-radius:16px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.06)">
                <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Active Duty Overview</div>
                <div style="display:flex;justify-content:space-around;text-align:center">
                  <div>
                    <div style="font-size:22px;font-weight:800;color:var(--warning)" id="dutyTotalPending">0</div>
                    <div style="font-size:11px;color:var(--text-muted)">Pending</div>
                  </div>
                  <div style="border-right:1px solid var(--glass-border)"></div>
                  <div>
                    <div style="font-size:22px;font-weight:800;color:var(--success)" id="dutyTotalDone">0</div>
                    <div style="font-size:11px;color:var(--text-muted)">Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ Member Duty Cards Grid ══ -->
      <div style="margin-bottom:24px">
        <h3 style="font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:14px">
          <i class="fas fa-user-check text-warning me-2"></i>Member Duty Cards
        </h3>
        <div class="row g-3" id="memberDutyCardsContainer">
          <div class="col-12 text-center" style="padding:30px;color:var(--text-muted)">
            <div class="loader-spinner" style="margin:0 auto 12px"></div>Loading duty assignments...
          </div>
        </div>
      </div>

      <!-- ══ All Assigned Duties Table ══ -->
      <div class="glass-card">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-clipboard-list"></i></div>
            All Assigned Duties & Items
          </h3>
          <div style="font-size:12px;color:var(--text-muted)">Full record of member assignments</div>
        </div>
        <div class="table-responsive" id="allDutiesTableContainer">
          <div style="padding:32px;text-align:center;color:var(--text-muted)">Loading duties table...</div>
        </div>
      </div>

    </div>

    <!-- Assign Duty Modal -->
    <div class="modal fade" id="assignDutyModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content glass-card">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-header-title">
              <i class="fas fa-plus-circle text-primary me-2"></i>Assign New Duty / Item
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label-custom">Duty Title / Item Name *</label>
              <input type="text" id="dutyTitleInput" class="form-control-custom" placeholder="e.g. Buy Daily Curry & Rice" required />
            </div>

            <div class="mb-3">
              <label class="form-label-custom">Assign To Member *</label>
              <select id="dutyAssignedToSelect" class="form-control-custom" style="cursor:pointer">
                <!-- Member options populated via JS -->
              </select>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label-custom">Category</label>
                <select id="dutyCategorySelect" class="form-control-custom">
                  <option value="Curry & Food">🍛 Curry & Food</option>
                  <option value="Groceries & Rice">🍚 Groceries & Rice</option>
                  <option value="Drinking Water & Gas">🚰 Water & Gas</option>
                  <option value="Room Cleaning">🧹 Room Cleaning</option>
                  <option value="Utilities">💡 Utilities & Bills</option>
                  <option value="General Duty">📌 General Duty</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label-custom">Frequency</label>
                <select id="dutyFrequencySelect" class="form-control-custom">
                  <option value="Daily">Daily Duty</option>
                  <option value="Weekly">Weekly Duty</option>
                  <option value="One-time">One-time Task</option>
                </select>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label-custom">Due Date</label>
              <input type="date" id="dutyDueDateInput" class="form-control-custom" />
            </div>

            <div class="mb-3">
              <label class="form-label-custom">Notes / Instructions</label>
              <textarea id="dutyNotesInput" class="form-control-custom" rows="2" placeholder="e.g. Bring 2 curries from hotel by 8 PM"></textarea>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn-secondary-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="button" onclick="submitAssignDuty()" class="btn-primary-custom">
              <i class="fas fa-check me-1"></i> Assign Duty Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  await fetchDutiesData();
};

async function fetchDutiesData() {
  const data = await api('/api/duties');
  if (!data || !data.success) return;

  const duties = data.duties || [];
  const members = data.members || [];
  const dutyStats = data.dutyStats || {};
  cachedDutyMembers = members;

  // Compute Total Counts
  const pendingCount = duties.filter(d => d.status === 'pending').length;
  const doneCount = duties.filter(d => d.status === 'completed').length;

  const pEl = document.getElementById('dutyTotalPending');
  if (pEl) pEl.textContent = pendingCount;
  const dEl = document.getElementById('dutyTotalDone');
  if (dEl) dEl.textContent = doneCount;

  // Render Member Duty Cards
  const cardsContainer = document.getElementById('memberDutyCardsContainer');
  if (cardsContainer) {
    if (members.length === 0) {
      cardsContainer.innerHTML = '<div class="col-12 text-center text-muted">No members found.</div>';
    } else {
      cardsContainer.innerHTML = members.map(m => {
        const stats = dutyStats[m.userid] || { totalAssigned: 0, pending: 0, completed: 0, complianceRate: 100 };
        const memberDuties = duties.filter(d => d.assignedToId === m.userid);
        const initials = (m.name || '?').substring(0, 2).toUpperCase();

        const avatarHtml = (m.userid === '192472374' || m.role === 'admin')
          ? `<img src="/images/jagan.jpg?v=622" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)" onerror="this.outerHTML='<div class=avatar style=width:44px;height:44px;border-radius:50%>${initials}</div>'" />`
          : `<div class="avatar" style="width:44px;height:44px;border-radius:50%;font-size:15px;font-weight:700;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center">${initials}</div>`;

        const complianceRate = stats.complianceRate || 100;
        const is100 = complianceRate === 100 && stats.totalAssigned > 0;
        const isPoor = complianceRate < 60;
        const scoreBadge = is100 
          ? '<span class="badge bg-success" style="font-size:10px">🏆 100% On Track</span>'
          : (isPoor ? `<span class="badge bg-danger" style="font-size:10px">⚠️ ${complianceRate}% Compliance</span>` : `<span class="badge bg-primary" style="font-size:10px">${complianceRate}% Done</span>`);

        return `
          <div class="col-xl-3 col-md-6">
            <div class="glass-card" style="padding:18px;position:relative;border:${isPoor ? '1px solid rgba(234,67,53,0.4)' : '1px solid var(--glass-border)'}">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:10px">
                  ${avatarHtml}
                  <div>
                    <div style="font-size:15px;font-weight:800;color:var(--text-primary)">${m.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${stats.completed}/${stats.totalAssigned} Completed</div>
                  </div>
                </div>
                ${scoreBadge}
              </div>

              <!-- Compliance Progress Bar -->
              <div class="progress mb-2" style="height:5px;border-radius:10px;background:var(--bg-2)">
                <div class="progress-bar ${isPoor ? 'bg-danger' : (is100 ? 'bg-success' : 'bg-primary')}" style="width:${complianceRate}%"></div>
              </div>

              <!-- List of Member's Duties -->
              <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto">
                ${memberDuties.length === 0 ? `
                  <div style="font-size:11.5px;color:var(--text-muted);font-style:italic;padding:6px">No duties assigned yet.</div>
                ` : memberDuties.map(d => {
                  const isDone = d.status === 'completed';
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-2);padding:6px 10px;border-radius:8px;font-size:12px">
                      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px;${isDone ? 'text-decoration:line-through;opacity:0.6' : ''}">
                        <i class="fas fa-tasks text-warning me-1"></i>${d.title}
                      </div>
                      <div style="display:flex;gap:4px">
                        ${!isDone ? `
                          <button onclick="nudgeDuty('${d.id}')" title="Send Telegram/Push Reminder" class="btn btn-sm btn-outline-warning" style="font-size:9.5px;padding:1px 5px">🔔 Nudge</button>
                          <button onclick="toggleDutyStatus('${d.id}', 'completed')" class="btn btn-sm btn-success" style="font-size:10px;padding:1px 6px;border-radius:6px">Done</button>
                        ` : `
                          <span class="badge bg-success" style="font-size:9.5px">Done ✅</span>
                        `}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Duties Table
  const tableContainer = document.getElementById('allDutiesTableContainer');
  if (tableContainer) {
    if (duties.length === 0) {
      tableContainer.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text-muted)">
          <i class="fas fa-tasks" style="font-size:32px;margin-bottom:10px;display:block;opacity:0.3"></i>
          No duties created yet. Click <strong>"Assign New Duty / Item"</strong> to create the first assignment!
        </div>
      `;
    } else {
      tableContainer.innerHTML = `
        <table class="table table-hover align-middle mb-0" style="font-size:13.5px">
          <thead style="background:var(--bg-2);color:var(--text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:0.5px">
            <tr>
              <th style="padding:12px 16px">Duty / Item</th>
              <th>Assigned To</th>
              <th>Category</th>
              <th>Due Date</th>
              <th>Status & Compliance</th>
              <th style="text-align:right;padding-right:16px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${duties.map(d => {
              const isDone = d.status === 'completed';
              return `
                <tr>
                  <td style="padding:12px 16px">
                    <strong style="${isDone ? 'text-decoration:line-through;opacity:0.6' : ''}">${d.title}</strong>
                    ${d.notes ? `<div style="font-size:11px;color:var(--text-muted)">${d.notes}</div>` : ''}
                  </td>
                  <td><span class="badge bg-primary" style="font-size:11px">${d.assignedToName}</span></td>
                  <td><span class="badge bg-secondary" style="font-size:11px">${d.category || 'Household'}</span></td>
                  <td style="font-family:monospace;font-size:12px;color:var(--text-muted)">${d.dueDate || 'Today'}</td>
                  <td>
                    ${isDone 
                      ? '<span class="badge bg-success" style="font-size:11px">Completed ✅</span>' 
                      : '<span class="badge bg-warning text-dark" style="font-size:11px">Pending ⏳</span>'}
                  </td>
                  <td style="text-align:right;padding-right:16px">
                    ${!isDone ? `
                      <button onclick="nudgeDuty('${d.id}')" class="btn btn-sm btn-outline-warning me-1" style="font-size:11px;padding:3px 8px">
                        <i class="fas fa-bell me-1"></i>Nudge
                      </button>
                      <button onclick="toggleDutyStatus('${d.id}', 'completed')" class="btn btn-sm btn-success me-1" style="font-size:11px;padding:3px 8px">
                        <i class="fas fa-check me-1"></i>Mark Done
                      </button>
                    ` : `
                      <button onclick="toggleDutyStatus('${d.id}', 'pending')" class="btn btn-sm btn-outline-secondary me-1" style="font-size:11px;padding:3px 8px">
                        Re-open
                      </button>
                    `}
                    <button onclick="deleteDuty('${d.id}')" class="btn btn-sm btn-outline-danger" style="font-size:11px;padding:3px 8px">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  }
}

// Open Assign Modal
window.openAssignDutyModal = function openAssignDutyModal(defaultMemberId = '') {
  const select = document.getElementById('dutyAssignedToSelect');
  if (select && cachedDutyMembers.length > 0) {
    select.innerHTML = cachedDutyMembers.map(m => `
      <option value="${m.userid}" ${m.userid === defaultMemberId ? 'selected' : ''}>${m.name} (${m.userid})</option>
    `).join('');
  }

  const dateInput = document.getElementById('dutyDueDateInput');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  const modal = new bootstrap.Modal(document.getElementById('assignDutyModal'));
  modal.show();
};

window.quickAssignToMember = function quickAssignToMember(userid, name) {
  openAssignDutyModal(userid);
};

// Submit Assign Duty
window.submitAssignDuty = async function submitAssignDuty() {
  const titleEl = document.getElementById('dutyTitleInput');
  const assignedToEl = document.getElementById('dutyAssignedToSelect');
  const catEl = document.getElementById('dutyCategorySelect');
  const freqEl = document.getElementById('dutyFrequencySelect');
  const dueDateEl = document.getElementById('dutyDueDateInput');
  const notesEl = document.getElementById('dutyNotesInput');

  if (!titleEl || !titleEl.value.trim()) {
    showToast('Missing Title', 'Please enter a duty/item title.', 'warning');
    return;
  }

  const payload = {
    title: titleEl.value.trim(),
    assignedToId: assignedToEl ? assignedToEl.value : '',
    category: catEl ? catEl.value : 'Household',
    frequency: freqEl ? freqEl.value : 'Daily',
    dueDate: dueDateEl ? dueDateEl.value : '',
    notes: notesEl ? notesEl.value.trim() : ''
  };

  showLoader();
  const res = await api('/api/duties/assign', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  hideLoader();

  if (res && res.success) {
    const modalEl = document.getElementById('assignDutyModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    showToast('Duty Assigned! 📌', res.message, 'success');
    titleEl.value = '';
    if (notesEl) notesEl.value = '';
    fetchDutiesData();
  } else {
    showToast('Error', res?.message || 'Failed to assign duty.', 'error');
  }
};

// Toggle Duty Status
window.toggleDutyStatus = async function toggleDutyStatus(id, status) {
  showLoader();
  const res = await api('/api/duties/update-status', {
    method: 'POST',
    body: JSON.stringify({ id, status })
  });
  hideLoader();

  if (res && res.success) {
    showToast('Duty Updated ✅', res.message, 'success');
    fetchDutiesData();
  } else {
    showToast('Error', res?.message || 'Failed to update status.', 'error');
  }
};

// Delete Duty
window.deleteDuty = async function deleteDuty(id) {
  if (!confirm('Remove this duty assignment?')) return;
  showLoader();
  const res = await api(`/api/duties/${id}`, { method: 'DELETE' });
  hideLoader();

  if (res && res.success) {
    showToast('Duty Removed 🗑️', res.message, 'info');
    fetchDutiesData();
  } else {
    showToast('Error', res?.message || 'Failed to delete duty.', 'error');
  }
};

// Send Nudge Reminder Alert to assigned member
window.nudgeDuty = async function nudgeDuty(id) {
  showLoader();
  const res = await api('/api/duties/nudge', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
  hideLoader();

  if (res && res.success) {
    showToast('Reminder Sent! 🔔', res.message, 'success');
  } else {
    showToast('Error', res?.message || 'Failed to send reminder.', 'error');
  }
};

