/**
 * rapid_expense.js – Rapid 15-Second One-Click Expense Entry Controller
 */

window.openRapidAddExpenseModal = function openRapidAddExpenseModal() {
  let modal = document.getElementById('rapidExpenseModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'rapidExpenseModal';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="background:var(--surface);border:1px solid var(--glass-border);border-radius:20px">
          <div class="modal-header">
            <h5 class="modal-title" style="font-size:16px;font-weight:800"><i class="fas fa-bolt text-warning me-2"></i>Rapid 15-Second Add Expense</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" style="padding:20px">
            <form id="rapidExpenseForm" onsubmit="event.preventDefault(); submitRapidExpense();">
              <div class="mb-3">
                <label class="form-label-custom">Expense Title *</label>
                <input type="text" id="rapidTitle" class="form-control-custom" placeholder="e.g. Chicken Curry" required />
              </div>
              <div class="mb-3">
                <label class="form-label-custom">Amount (₹) *</label>
                <input type="number" id="rapidAmount" class="form-control-custom" placeholder="e.g. 360" min="1" required />
              </div>
              <div class="mb-3">
                <label class="form-label-custom">Category</label>
                <select id="rapidCategory" class="form-control-custom">
                  <option value="Dinner">Dinner</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Groceries">Groceries</option>
                </select>
              </div>
              <button type="submit" class="btn-primary-custom" style="width:100%;padding:12px;border-radius:12px;font-size:15px">
                <i class="fas fa-check-circle me-1"></i>Save Expense (15s Rapid)
              </button>
            </form>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById('rapidTitle').value = '';
  document.getElementById('rapidAmount').value = '';
  new bootstrap.Modal(modal).show();
};

window.submitRapidExpense = async function submitRapidExpense() {
  const title = document.getElementById('rapidTitle').value.trim();
  const amount = parseFloat(document.getElementById('rapidAmount').value);
  const category = document.getElementById('rapidCategory').value;

  if (!title || isNaN(amount)) return;

  const modalEl = document.getElementById('rapidExpenseModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();

  const user = App.currentUser || { userid: '192472374', name: 'Jagan' };

  showLoader();
  const res = await api('/api/expenses', {
    method: 'POST',
    body: JSON.stringify({
      title,
      amount,
      category,
      paidBy: user.userid,
      paidByName: user.name || user.shortName || 'Admin',
      date: new Date().toISOString().split('T')[0],
      splitBetween: ['192472374', '192472343', '192411184', '192411185']
    })
  });
  hideLoader();

  if (res && res.success) {
    showToast('Expense Added ⚡', `₹${amount} recorded in under 15 seconds!`, 'success');
    if (typeof loadDashboard === 'function' && App.currentView === 'dashboard') loadDashboard();
  } else {
    showToast('Save Error', res?.message || 'Could not save expense', 'error');
  }
};
