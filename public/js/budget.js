/**
 * budget.js – Monthly Budget Planner & Category Spending Progress Controller
 */

window.loadBudgetView = async function loadBudgetView() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-piggy-bank"></i></div>
            Monthly Budget Planner & Forecast
          </h3>
          ${App.isAdmin ? `
            <button class="btn-primary-custom" onclick="openSetBudgetModal()">
              <i class="fas fa-cog me-1"></i>Set Monthly Budget
            </button>
          ` : ''}
        </div>
        <div class="card-body-custom" id="budgetCardBody">
          <div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading budget sheet...</div>
        </div>
      </div>
    </div>
  `;

  const res = await api('/api/budget');
  const body = document.getElementById('budgetCardBody');
  if (!res || !res.success || !body) return;

  const d = res.data;
  const colorClass = d.status === 'red' ? 'danger' : (d.status === 'yellow' ? 'warning' : 'success');

  body.innerHTML = `
    <div class="row g-4 mb-4">
      <div class="col-md-3 col-6">
        <div style="background:var(--bg-2);border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Target Budget</div>
          <div style="font-size:24px;font-weight:900;color:var(--primary)">₹${d.budget.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div style="background:var(--bg-2);border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Total Spent</div>
          <div style="font-size:24px;font-weight:900;color:var(--text-primary)">₹${d.spent.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div style="background:var(--bg-2);border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Remaining Budget</div>
          <div style="font-size:24px;font-weight:900;color:${d.remaining > 0 ? '#34a853' : '#ea4335'}">₹${d.remaining.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div style="background:var(--bg-2);border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">AI Next Month Forecast</div>
          <div style="font-size:24px;font-weight:900;color:#7c4dff">₹${d.predictedNextMonth.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="mb-4">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;font-weight:600">
        <span style="color:var(--text-secondary)">Budget Utilization (${d.percentage}%)</span>
        <span style="color:${d.status === 'red' ? '#ea4335' : d.status === 'yellow' ? '#fbbc04' : '#34a853'}">
          ${d.status === 'red' ? '⚠ Over Budget Warning!' : d.status === 'yellow' ? '⚡ Caution: Approaching Budget Limit' : '✅ Within Budget Limits'}
        </span>
      </div>
      <div class="progress-custom" style="height:14px;border-radius:10px">
        <div class="progress-fill ${colorClass}" style="width:${d.percentage}%"></div>
      </div>
    </div>
  `;
};

window.openSetBudgetModal = function openSetBudgetModal() {
  const amount = prompt('Enter monthly budget limit in ₹:', '12000');
  if (amount && !isNaN(amount)) {
    api('/api/budget', {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(amount) })
    }).then(res => {
      if (res && res.success) {
        showToast('Budget Updated 💰', res.message, 'success');
        loadBudgetView();
      }
    });
  }
};
