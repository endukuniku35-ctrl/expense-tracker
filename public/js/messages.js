/**
 * messages.js – Roommate Chat & Payment Reminders
 */

let lastMsgId = null;

async function loadChatMessages() {
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
    const isMe = App.user && App.user.userid === m.senderId;
    const isNudge = m.isNudge;
    const timeStr = timeAgo ? timeAgo(m.timestamp) : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isNudge) {
      return `
        <div style="align-self:center;max-width:85%;background:rgba(26,115,232,0.1);border:1px solid rgba(26,115,232,0.3);border-radius:14px;padding:12px 16px;text-align:center;font-size:13px;color:var(--text-primary);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
          <div style="font-weight:700;color:var(--primary);margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:6px">
            <i class="fas fa-bell text-warning"></i> ${m.senderName} sent a Payment Reminder
          </div>
          <div>${m.text}</div>
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

  if (isAtBottom || isFirstNotifLoad) {
    box.scrollTop = box.scrollHeight;
  }
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

  input.value = '';
  const res = await api('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ message: msg })
  });

  if (res && res.success) {
    await loadChatMessages();
    const box = document.getElementById('chatMessagesBox');
    if (box) box.scrollTop = box.scrollHeight;
  } else {
    showToast('Error', res?.message || 'Failed to send message', 'danger');
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
    showToast('Error', res?.message || 'Failed to send reminder', 'danger');
  }
}

// Auto-refresh chat messages every 5 seconds when chat view is active
setInterval(() => {
  const chatView = document.getElementById('view-chat');
  if (chatView && chatView.classList.contains('active')) {
    loadChatMessages();
  }
}, 5000);
