/**
 * community.js – Community Features: Meal Polls, Shared Shopping List, Help Centre & Feedback
 */

window.loadCommunityView = async function loadCommunityView() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <!-- Community Banner -->
      <div class="glass-card mb-4" style="background:linear-gradient(135deg,rgba(124,77,255,0.1),rgba(26,115,232,0.1));border:1px solid rgba(124,77,255,0.3)">
        <div class="card-body-custom" style="padding:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div>
            <h4 style="font-weight:800;color:var(--text-primary);margin-bottom:4px">🤝 Roommate Community Hub</h4>
            <div style="font-size:13px;color:var(--text-secondary)">Vote on meal menus, manage shared groceries, view help FAQ, and submit feedback.</div>
          </div>
          <button class="btn-primary-custom" onclick="openFeedbackModal()" style="font-size:13px;padding:8px 16px;background:linear-gradient(135deg,#7c4dff,#1a73e8)">
            ⭐ Give App Feedback
          </button>
        </div>
      </div>

      <div class="row g-4">
        <!-- Meal Polls -->
        <div class="col-lg-6">
          <div class="glass-card mb-4">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-poll text-primary"></i></div>
                Tomorrow's Meal Poll
              </h3>
            </div>
            <div id="pollsContent" class="card-body-custom">
              <div style="text-align:center;padding:20px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading polls...</div>
            </div>
          </div>
        </div>

        <!-- Shared Shopping List -->
        <div class="col-lg-6">
          <div class="glass-card mb-4">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-shopping-basket text-success"></i></div>
                Shared Grocery Shopping List
              </h3>
              <button class="btn-ghost" onclick="addShoppingListItem()" style="font-size:12px">+ Add Item</button>
            </div>
            <div id="shoppingListContent" class="card-body-custom">
              <div style="text-align:center;padding:20px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading shopping list...</div>
            </div>
          </div>
        </div>

        <!-- Help Centre FAQ -->
        <div class="col-12">
          <div class="glass-card mb-4">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-question-circle text-info"></i></div>
                Help Centre & Frequently Asked Questions
              </h3>
            </div>
            <div class="card-body-custom">
              <div class="accordion" id="helpAccordion">
                <div class="accordion-item" style="background:var(--surface);border:1px solid var(--glass-border);margin-bottom:8px;border-radius:10px;overflow:hidden">
                  <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#help1" style="background:var(--surface);color:var(--text-primary);font-weight:700">
                      How is my daily curry share calculated?
                    </button>
                  </h2>
                  <div id="help1" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                    <div class="accordion-body" style="font-size:13px;color:var(--text-secondary)">
                      CurryTracker uses a dynamic per-meal division algorithm. Total bill amount is divided equally among only the members selected in the <code>splitBetween</code> list. If 4 members ate a ₹360 bill, your share is ₹90.
                    </div>
                  </div>
                </div>

                <div class="accordion-item" style="background:var(--surface);border:1px solid var(--glass-border);margin-bottom:8px;border-radius:10px;overflow:hidden">
                  <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#help2" style="background:var(--surface);color:var(--text-primary);font-weight:700">
                      How do I pay my outstanding balance via PhonePe / GPay?
                    </button>
                  </h2>
                  <div id="help2" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                    <div class="accordion-body" style="font-size:13px;color:var(--text-secondary)">
                      Go to the <strong>Payment Status</strong> tab, tap <strong>Pay Now</strong> or scan the dynamic PhonePe UPI QR code. You can also copy UPI ID <code>8367047947@ybl</code> and upload your payment receipt for verification!
                    </div>
                  </div>
                </div>

                <div class="accordion-item" style="background:var(--surface);border:1px solid var(--glass-border);margin-bottom:8px;border-radius:10px;overflow:hidden">
                  <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#help3" style="background:var(--surface);color:var(--text-primary);font-weight:700">
                      How do I receive mobile push notifications when messages or bills are added?
                    </button>
                  </h2>
                  <div id="help3" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                    <div class="accordion-body" style="font-size:13px;color:var(--text-secondary)">
                      Tap <strong>Enable Mobile Alerts</strong> on the top notification banner. Make sure your phone's Android OS settings allow notifications for CurryTracker!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadPolls();
  loadShoppingList();
};

async function loadPolls() {
  const res = await api('/api/community/polls');
  const body = document.getElementById('pollsContent');
  if (!res || !res.success || !body) return;

  const polls = res.polls || [];
  body.innerHTML = polls.map(p => `
    <div style="font-weight:700;color:var(--text-primary);margin-bottom:12px;font-size:15px">${p.question}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${p.options.map((opt, i) => `
        <button class="btn-ghost" style="text-align:left;padding:10px 14px;border:1px solid var(--glass-border);border-radius:10px;display:flex;justify-content:space-between;align-items:center" onclick="votePoll('${p.id}', ${i})">
          <span style="font-weight:600;color:var(--text-primary)">${opt.text}</span>
          <span class="badge bg-primary" style="font-size:11px">${opt.votes} Votes</span>
        </button>
      `).join('')}
    </div>
  `).join('');
}

async function votePoll(pollId, optionIndex) {
  const res = await api('/api/community/polls/vote', {
    method: 'POST',
    body: JSON.stringify({ pollId, optionIndex })
  });
  if (res && res.success) {
    showToast('Vote Submitted 🗳️', res.message, 'success');
  }
}

async function loadShoppingList() {
  const res = await api('/api/community/shopping-list');
  const body = document.getElementById('shoppingListContent');
  if (!res || !res.success || !body) return;

  const items = res.items || [];
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${items.map(item => `
        <div style="background:var(--bg-2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" ${item.completed ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer" />
            <span style="font-size:13.5px;color:var(--text-primary);${item.completed ? 'text-decoration:line-through;opacity:0.6' : 'font-weight:600'}">${escapeHtml(item.item)}</span>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">Added by ${item.addedBy}</span>
        </div>
      `).join('')}
    </div>
  `;
}

window.addShoppingListItem = function addShoppingListItem() {
  const item = prompt('Enter item to add to shopping list (e.g. Tomatoes 2kg):');
  if (item) {
    api('/api/community/shopping-list', {
      method: 'POST',
      body: JSON.stringify({ item })
    }).then(res => {
      if (res && res.success) {
        showToast('Item Added 🛒', res.message, 'success');
        loadShoppingList();
      }
    });
  }
};

window.openFeedbackModal = function openFeedbackModal() {
  const rating = prompt('Rate CurryTracker from 1 to 5 stars (e.g. 5):', '5');
  if (!rating) return;
  const feedback = prompt('Any comments or suggestions for improvement?');

  api('/api/community/feedback', {
    method: 'POST',
    body: JSON.stringify({ rating: parseInt(rating), feedback, easyToManage: true })
  }).then(res => {
    if (res && res.success) {
      showToast('Thank You! ⭐', res.message, 'success', 5000);
    }
  });
};
