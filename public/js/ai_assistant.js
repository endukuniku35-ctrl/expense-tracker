/**
 * ai_assistant.js – Ask CurryTracker AI Chatbot, Insights & Voice Assistant Engine
 */

window.initAIAssistant = async function initAIAssistant() {
  const container = document.getElementById('aiInsightsBanner');
  if (container) {
    const res = await api('/api/ai/insights');
    if (res && res.success && Array.isArray(res.insights)) {
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,rgba(124,77,255,0.1),rgba(26,115,232,0.1));border:1px solid rgba(124,77,255,0.25);border-radius:14px;padding:16px;margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-weight:800;color:var(--text-primary);display:flex;align-items:center;gap:8px;font-size:15px">
              <span>🤖</span> AI Financial Assistant Insights
            </div>
            <span class="badge bg-purple" style="background:#7c4dff;color:#fff;font-weight:700;font-size:11px">AI Forecast: ₹${(res.estimatedNextMonth||0).toLocaleString('en-IN')} Next Month</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
            ${res.insights.map(i => `
              <div style="background:var(--surface);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;border:1px solid var(--glass-border)">
                <span style="font-size:16px">${i.icon}</span>
                <span>${i.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }
};

window.sendAIChatQuery = async function sendAIChatQuery() {
  const input = document.getElementById('aiChatInput');
  const chatBody = document.getElementById('aiChatMessages');
  if (!input || !input.value.trim() || !chatBody) return;

  const query = input.value.trim();
  input.value = '';

  chatBody.innerHTML += `
    <div style="margin-bottom:10px;text-align:right">
      <div style="display:inline-block;background:var(--primary);color:#fff;padding:8px 14px;border-radius:14px 14px 2px 14px;font-size:13px">${escapeHtml(query)}</div>
    </div>
  `;
  chatBody.scrollTop = chatBody.scrollHeight;

  const res = await api('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ query })
  });

  if (res && res.success) {
    chatBody.innerHTML += `
      <div style="margin-bottom:10px;text-align:left">
        <div style="display:inline-block;background:rgba(124,77,255,0.12);color:var(--text-primary);border:1px solid rgba(124,77,255,0.25);padding:10px 14px;border-radius:14px 14px 14px 2px;font-size:13px">${res.reply}</div>
      </div>
    `;
  } else {
    chatBody.innerHTML += `
      <div style="margin-bottom:10px;text-align:left">
        <div style="display:inline-block;background:rgba(234,67,53,0.1);color:#ea4335;padding:8px 14px;border-radius:14px;font-size:13px">Sorry, failed to process AI response.</div>
      </div>
    `;
  }
  chatBody.scrollTop = chatBody.scrollHeight;
};

window.startVoiceEntry = function startVoiceEntry() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice Error', 'Speech recognition is not supported in this browser.', 'warning');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;

  showToast('Listening... 🎤', 'Speak your expense details (e.g., "Chicken 580 paid by Jagan")', 'info', 4000);

  recognition.onresult = async function(event) {
    const transcript = event.results[0][0].transcript;
    showToast('Recognized 🎤', `"${transcript}"`, 'success');

    const res = await api('/api/ai/voice-parse', {
      method: 'POST',
      body: JSON.stringify({ transcript })
    });

    if (res && res.success && res.parsed) {
      if (typeof openAddExpense === 'function') {
        await openAddExpense();
        setTimeout(() => {
          if (document.getElementById('expTitle')) document.getElementById('expTitle').value = res.parsed.title;
          if (document.getElementById('expAmount')) document.getElementById('expAmount').value = res.parsed.amount;
          if (document.getElementById('expCategory')) document.getElementById('expCategory').value = res.parsed.category;
          if (document.getElementById('expPaidBy')) document.getElementById('expPaidBy').value = res.parsed.paidBy;
        }, 200);
      }
    }
  };

  recognition.onerror = function() {
    showToast('Voice Error', 'Failed to capture voice input.', 'error');
  };

  recognition.start();
};
