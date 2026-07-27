/**
 * messages.js – Roommate Chat & Admin Broadcast Center (Admin Only)
 */

let lastMsgId = null;

async function loadChatMessages() {
  const content = document.getElementById('viewContent');
  if (!content) return;

  // Ensure shell element exists if viewContent was overwritten by another view
  let viewEl = document.getElementById('view-chat');
  if (!viewEl) {
    content.innerHTML = `
      <div class="view-section" id="view-chat" style="animation:fadeInUp 0.4s ease">
        <div class="glass-card mb-4">
          <div class="card-header-custom" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-comments"></i></div>
                Roommate Group Chat & Payment Reminders
              </h3>
              <div style="font-size:12px;color:var(--text-muted)">Real-time group chat, food updates & automated UPI payment nudges</div>
            </div>
            <button class="btn-primary-custom" onclick="openNudgeModal()" style="font-size:13px;padding:8px 16px">
              <i class="fas fa-bell me-1"></i>Send Payment Reminder Nudge
            </button>
          </div>
          
          <div style="padding:20px">
            <!-- Chat Messages Container -->
            <div id="chatMessagesBox" style="height:420px;overflow-y:auto;background:var(--bg-1);border:1px solid var(--glass-border);border-radius:14px;padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:12px">
              <div style="text-align:center;color:var(--text-muted);margin:auto">Loading messages...</div>
            </div>

            <!-- Message Form -->
            <form id="chatForm" onsubmit="event.preventDefault(); sendChatMessage();" style="display:flex;gap:10px">
              <input type="text" class="form-control-custom" id="chatInput" placeholder="Type a message or note for roommates..." style="flex:1" autocomplete="off" required />
              <button type="submit" class="btn-primary-custom" style="padding:10px 24px;border-radius:12px;white-space:nowrap">
                <i class="fas fa-paper-plane me-1"></i>Send
              </button>
            </form>
          </div>
        </div>
      </div>`;
  }

  const data = await api('/api/messages');
  if (!data || !data.data) return;

  const messages = data.data;
  const box = document.getElementById('chatMessagesBox');
  if (!box) return;

  if (messages.length === 0) {
    box.innerHTML = `
      <div style="text-align:center;color:var(--text-muted);margin:auto">
        <i class="fas fa-comments" style="font-size:36px;margin-bottom:12px;display:block;opacity:0.4"></i>
        No messages yet. Start the conversation with your roommates!
      </div>
    `;
    return;
  }

  const isAtBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 50;

  box.innerHTML = messages.map(m => {
    const isMe = App.currentUser && App.currentUser.userid === m.senderId;
    const isNudge = m.isNudge;
    const timeStr = typeof timeAgo === 'function' ? timeAgo(m.timestamp) : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isNudge) {
      return `
        <div style="align-self:center;max-width:85%;background:rgba(26,115,232,0.1);border:1px solid rgba(26,115,232,0.3);border-radius:14px;padding:12px 16px;text-align:center;font-size:13px;color:var(--text-primary);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
          <div style="font-weight:700;color:var(--primary);margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:6px">
            <i class="fas fa-bell text-warning"></i> ${m.senderName} sent an Announcement / Reminder
          </div>
          <div>${escapeHtml(m.text)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${timeStr}</div>
        </div>
      `;
    }

    return `
      <div style="display:flex;gap:10px;align-self:${isMe ? 'flex-end' : 'flex-start'};max-width:80%;flex-direction:${isMe ? 'row-reverse' : 'row'}">
        <div style="width:36px;height:36px;border-radius:50%;background:${isMe ? 'var(--primary)' : 'var(--bg-2)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">
          ${m.senderAvatar || m.senderName.substring(0, 2).toUpperCase()}
        </div>
        <div style="background:${isMe ? 'var(--primary)' : 'var(--glass-bg)'};color:${isMe ? '#ffffff' : 'var(--text-primary)'};border:${isMe ? 'none' : '1px solid var(--glass-border)'};padding:10px 14px;border-radius:14px;font-size:13.5px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
          <div style="font-size:11px;font-weight:700;margin-bottom:4px;opacity:0.8;display:flex;align-items:center;gap:6px">
            ${m.senderName} ${m.senderRole === 'admin' ? '👑' : ''}
          </div>
          <div style="word-break:break-word;line-height:1.4">${escapeHtml(m.text)}</div>
          <div style="font-size:10px;opacity:0.65;text-align:right;margin-top:4px">${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  const senderName = (typeof App !== 'undefined' && App && App.currentUser) ? (App.currentUser.name || App.currentUser.shortName) : 'Roommate';

  input.value = '';
  const res = await api('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ message: msg, senderName: senderName })
  });

  if (res && res.success) {
    await loadChatMessages();
    const box = document.getElementById('chatMessagesBox');
    if (box) box.scrollTop = box.scrollHeight;
  } else {
    await loadChatMessages();
  }
}

async function openNudgeModal() {
  const membersRes = await api('/api/members');
  if (!membersRes || !membersRes.data) return;

  const select = document.getElementById('nudgeTargetMember');
  if (!select) return;

  const oweMembers = membersRes.data.filter(m => m.net < 0);
  if (oweMembers.length === 0) {
    select.innerHTML = membersRes.data.map(m => `<option value="${m.userid}">${m.name} (${m.userid})</option>`).join('');
  } else {
    select.innerHTML = oweMembers.map(m => `<option value="${m.userid}">${m.name} (Owes ₹${Math.abs(m.net).toFixed(2)})</option>`).join('');
  }

  const modal = new bootstrap.Modal(document.getElementById('nudgeModal'));
  modal.show();
}

async function submitPaymentNudge() {
  const select = document.getElementById('nudgeTargetMember');
  const amountInput = document.getElementById('nudgeAmount');
  if (!select || !amountInput) return;

  const targetId = select.value;
  const targetName = select.options[select.selectedIndex].text.split('(')[0].trim();
  const amount = amountInput.value;

  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount', 'warning');
    return;
  }

  const modalEl = document.getElementById('nudgeModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();

  const res = await api('/api/messages/nudge', {
    method: 'POST',
    body: JSON.stringify({ targetMemberId: targetId, targetMemberName: targetName, amount: amount })
  });

  if (res && res.success) {
    showToast('Reminder Sent! 📲', res.message, 'success');
    await loadChatMessages();
  } else {
    showToast('Error', res?.message || 'Failed to send reminder', 'error');
  }
}

// ─── Admin Broadcast Controller ─────────────────────

async function loadAdminBroadcasts() {
  const content = document.getElementById('viewContent');
  if (!content) return;

  let viewEl = document.getElementById('view-broadcast');
  if (!viewEl) {
    content.innerHTML = `
      <div class="view-section" id="view-broadcast" style="animation:fadeInUp 0.4s ease">
        <!-- New Broadcast Form -->
        <div class="glass-card mb-4">
          <div class="card-header-custom">
            <h3 class="card-title-custom">
              <div class="card-title-icon"><i class="fas fa-bullhorn text-warning"></i></div>
              Send Official Announcement / Broadcast Alert
            </h3>
            <div style="font-size:12px;color:var(--text-muted)">Broadcast alert messages to all 6 roommate members instantly</div>
          </div>
          <div style="padding:20px">
            <div class="row g-3 mb-3">
              <div class="col-md-4">
                <label class="form-label-custom">Broadcast Category</label>
                <select class="form-control-custom" id="bcastType">
                  <option value="announcement">📢 General Announcement</option>
                  <option value="urgent">🚨 Urgent Alert</option>
                  <option value="curry">🍛 Curry / Meal Update</option>
                  <option value="payment">💰 Payment Reminder</option>
                </select>
              </div>
              <div class="col-md-8">
                <label class="form-label-custom">Subject / Headline (Optional)</label>
                <input type="text" class="form-control-custom" id="bcastSubject" placeholder="e.g. Curry Expense Settlement Reminder for July" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label-custom">Announcement Message Text</label>
              <textarea class="form-control-custom" id="bcastText" rows="3" placeholder="Type official broadcast message here..."></textarea>
            </div>
            <button class="btn-primary-custom" onclick="submitAdminBroadcast()" style="padding:10px 24px">
              <i class="fas fa-paper-plane me-1"></i>Broadcast to All Members
            </button>
          </div>
        </div>

        <!-- Broadcast Log History -->
        <div class="glass-card">
          <div class="card-header-custom">
            <h3 class="card-title-custom">
              <div class="card-title-icon"><i class="fas fa-history"></i></div>
              Broadcast History Log
            </h3>
          </div>
          <div style="padding:20px" id="broadcastHistoryLog">
            <div style="text-align:center;color:var(--text-muted);padding:20px">Loading broadcast log...</div>
          </div>
        </div>
      </div>`;
  }

  const data = await api('/api/messages');
  if (!data || !data.data) return;

  const broadcasts = data.data.filter(m => m.isBroadcast || m.isNudge);
  const log = document.getElementById('broadcastHistoryLog');
  if (!log) return;

  if (broadcasts.length === 0) {
    log.innerHTML = `
      <div style="text-align:center;color:var(--text-muted);padding:32px">
        <i class="fas fa-bullhorn" style="font-size:32px;margin-bottom:8px;display:block;opacity:0.4"></i>
        No broadcasts sent yet.
      </div>
    `;
    return;
  }

  log.innerHTML = `
    <div class="table-responsive">
      <table class="table table-custom">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Type / Icon</th>
            <th>Broadcast Message</th>
            <th>Sender</th>
            <th>Recipients</th>
          </tr>
        </thead>
        <tbody>
          ${broadcasts.reverse().map(b => `
            <tr>
              <td style="font-size:12px;white-space:nowrap">${typeof timeAgo === 'function' ? timeAgo(b.timestamp) : new Date(b.timestamp).toLocaleString()}</td>
              <td><span class="badge bg-primary" style="font-size:11px">${b.senderAvatar || '📢'} Broadcast</span></td>
              <td style="font-weight:600">${escapeHtml(b.text)}</td>
              <td><span class="badge bg-secondary">${b.senderName}</span></td>
              <td><span class="badge bg-success">All 6 Members</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function submitAdminBroadcast() {
  const typeSelect = document.getElementById('bcastType');
  const subjectInput = document.getElementById('bcastSubject');
  const textInput = document.getElementById('bcastText');

  if (!textInput || !textInput.value.trim()) {
    showToast('Empty Message', 'Please enter broadcast message text', 'warning');
    return;
  }

  const type = typeSelect ? typeSelect.value : 'announcement';
  const subject = subjectInput ? subjectInput.value.trim() : '';
  const text = textInput.value.trim();

  textInput.value = '';
  if (subjectInput) subjectInput.value = '';

  const res = await api('/api/messages/broadcast', {
    method: 'POST',
    body: JSON.stringify({ type, subject, text })
  });

  if (res && res.success) {
    showToast('Broadcast Sent! 📢', 'Official announcement broadcasted to all 6 members.', 'success', 4000);
    await loadAdminBroadcasts();
  } else {
    showToast('Error', res?.message || 'Failed to send broadcast', 'error');
  }
}

window.loadChatMessages = loadChatMessages;
window.loadAdminBroadcasts = loadAdminBroadcasts;

// Auto-refresh chat messages every 2 seconds when user is on the chat view
setInterval(() => {
  if (typeof App !== 'undefined' && App && App.currentView === 'chat') {
    loadChatMessages();
  }
}, 2000);
