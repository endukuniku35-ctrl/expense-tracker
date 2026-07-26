/**
 * expenses.js – Expense Management View (Dynamic 2, 3, or 4 member split)
 */

let expensesState = {
  page: 1,
  totalPages: 1,
  search: '',
  month: '',
  member: '',
  category: '',
  sortBy: 'date-desc',
  deleteId: null
};

const MEMBER_MAP = {
  '192472374': 'Jagan',
  '192472343': 'Sagar',
  '192411184': 'Prathap',
  '192411185': 'Bharath'
};

async function loadExpenses() {
  const content = document.getElementById('viewContent');
  const isAdmin = App.isAdmin;

  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-receipt"></i></div>
            Expense History
          </h3>
          ${isAdmin ? `
            <button class="btn-primary-custom" onclick="openAddExpense()" id="addExpenseBtn">
              <i class="fas fa-plus"></i> Add Expense
            </button>
          ` : ''}
        </div>

        <!-- Filters -->
        <div class="filters-bar">
          <input class="filter-search" type="text" id="expSearch" placeholder="🔍 Search expenses..."
                 value="${expensesState.search}" oninput="expensesState.search=this.value;expensesState.page=1;fetchExpenses()" />

          <select class="filter-select" id="expMonth" onchange="expensesState.month=this.value;expensesState.page=1;fetchExpenses()">
            <option value="">All Months</option>
            ${generateMonthOptions()}
          </select>

          <select class="filter-select" id="expMember" onchange="expensesState.member=this.value;expensesState.page=1;fetchExpenses()">
            <option value="">All Members</option>
            <option value="192472374">Jagan</option>
            <option value="192472343">Sagar</option>
            <option value="192411184">Prathap</option>
            <option value="192411185">Bharath</option>
          </select>

          <select class="filter-select" id="expCategory" onchange="expensesState.category=this.value;expensesState.page=1;fetchExpenses()">
            <option value="">All Categories</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Snacks">Snacks</option>
            <option value="General">General</option>
          </select>

          <select class="filter-select" id="expSort" onchange="expensesState.sortBy=this.value;fetchExpenses()">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>

          <button class="btn-ghost" onclick="resetFilters()">
            <i class="fas fa-undo me-1"></i>Reset
          </button>
        </div>

        <!-- Table -->
        <div class="table-responsive" id="expensesTableWrap">
          <div style="padding:60px;text-align:center">
            <div class="loader-spinner" style="margin:0 auto 12px"></div>
            <div style="color:var(--text-muted)">Loading expenses...</div>
          </div>
        </div>

        <!-- Pagination -->
        <div id="expensesPagination" style="padding:16px 20px"></div>
      </div>
    </div>
  `;

  fetchExpenses();
}

function generateMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    months.push(`<option value="${key}">${label}</option>`);
  }
  return months.join('');
}

function resetFilters() {
  expensesState = { ...expensesState, page: 1, search: '', month: '', member: '', category: '', sortBy: 'date-desc' };
  document.getElementById('expSearch').value = '';
  document.getElementById('expMonth').value = '';
  document.getElementById('expMember').value = '';
  document.getElementById('expCategory').value = '';
  document.getElementById('expSort').value = 'date-desc';
  fetchExpenses();
}

async function fetchExpenses() {
  const { search, month, member, category, sortBy, page } = expensesState;
  const params = new URLSearchParams({ search, month, member, category, sortBy, page, limit: 15 });
  const data = await api(`/api/expenses?${params}`);
  if (!data) return;

  expensesState.totalPages = data.meta.pages;

  const wrap = document.getElementById('expensesTableWrap');
  const isAdmin = App.isAdmin;

  if (!data.data || data.data.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <div class="empty-title">No expenses found</div>
        <div class="empty-desc">Try adjusting your filters or add a new expense.</div>
        ${isAdmin ? `<button class="btn-primary-custom mt-3" onclick="openAddExpense()"><i class="fas fa-plus me-1"></i>Add Expense</button>` : ''}
      </div>
    `;
    document.getElementById('expensesPagination').innerHTML = '';
    return;
  }

  wrap.innerHTML = `
    <table class="custom-table">
      <thead><tr>
        <th onclick="sortBy('date')"><i class="fas fa-calendar me-1"></i>Date <i class="fas fa-sort"></i></th>
        <th>Expense</th>
        <th>Total Amount</th>
        <th>Paid By</th>
        <th>Split Details</th>
        <th>Category</th>
        <th>Notes</th>
        ${isAdmin ? '<th style="text-align:center">Actions</th>' : ''}
      </tr></thead>
      <tbody>
        ${data.data.map(e => {
          const splitList = (Array.isArray(e.splitBetween) && e.splitBetween.length > 0) ? e.splitBetween : ['192472374', '192472343', '192411184', '192411185'];
          const count = splitList.length;
          const eachShare = Math.round(e.amount / count);
          const names = splitList.map(uid => MEMBER_MAP[uid] || uid).join(', ');

          return `
            <tr>
              <td style="color:var(--text-muted);font-size:13px;white-space:nowrap">${formatDate(e.date)}</td>
              <td>
                <div style="font-weight:600;color:var(--text-primary)">${e.title}</div>
                <div style="font-size:11px;color:var(--text-muted)">${e.description || ''}</div>
              </td>
              <td>
                <strong style="color:var(--primary);font-size:15px">${formatCurrency(e.amount)}</strong>
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="avatar ${avatarClass(e.paidByName)}">${e.paidByName.substring(0,2).toUpperCase()}</div>
                  <span style="font-size:13px">${e.paidByName}</span>
                </div>
              </td>
              <td>
                <span class="badge-cat" style="background:rgba(26,115,232,0.1);color:var(--primary);border-color:rgba(26,115,232,0.2)">
                  ${formatCurrency(eachShare)} / person (${count} members)
                </span>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px" title="${names}">${names}</div>
              </td>
              <td><span class="badge-cat">${e.category}</span></td>
              <td style="color:var(--text-muted);font-size:12px;max-width:150px">${e.notes || '-'}</td>
              ${isAdmin ? `
                <td>
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn-ghost" style="padding:6px 10px" onclick="openEditExpense('${e.id}')" title="Edit">
                      <i class="fas fa-edit text-primary"></i>
                    </button>
                    <button class="btn-danger-custom" style="padding:6px 10px" onclick="openDeleteExpense('${e.id}','${e.title.replace(/'/g,"\\'")}')" title="Delete">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              ` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:12px 20px;background:var(--bg-2);font-size:13px;color:var(--text-secondary);border-top:1px solid var(--glass-border);display:flex;justify-content:space-between;align-items:center">
      <span>Showing ${data.data.length} of ${data.meta.total} expenses &bull; Total: <strong style="color:var(--primary)">${formatCurrency(data.meta.totalAmount)}</strong></span>
    </div>
  `;

  // Pagination
  renderPagination(data.meta.page, data.meta.pages);
}

function renderPagination(current, total) {
  if (total <= 1) {
    document.getElementById('expensesPagination').innerHTML = '';
    return;
  }
  let html = '<div class="pagination-custom">';
  html += `<button class="page-btn" onclick="goPage(${current - 1})" ${current <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${current + 1})" ${current >= total ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
  html += '</div>';
  document.getElementById('expensesPagination').innerHTML = html;
}

function goPage(p) {
  if (p < 1 || p > expensesState.totalPages) return;
  expensesState.page = p;
  fetchExpenses();
  document.getElementById('expensesTableWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Preset helper for member checkboxes ───────────
function setSplitPreset(pattern) {
  const checks = document.querySelectorAll('.split-member-check');
  checks.forEach((chk, idx) => {
    chk.checked = !!pattern[idx];
  });
  updateSplitPreview();
}

function getSelectedSplitMembers() {
  const checks = document.querySelectorAll('.split-member-check');
  const selected = [];
  checks.forEach(chk => {
    if (chk.checked) selected.push(chk.value);
  });
  return selected;
}

// ─── Live Split Preview ────────────────────────────
function updateSplitPreview() {
  const amount = parseFloat(document.getElementById('expAmount').value || 0);
  const preview = document.getElementById('splitPreview');
  if (!preview) return;

  const selected = getSelectedSplitMembers();
  const count = selected.length;

  if (amount > 0 && count > 0) {
    preview.style.display = 'block';
    const each = Math.round(amount / count);
    const names = selected.map(uid => MEMBER_MAP[uid] || uid).join(', ');

    document.getElementById('spTotal').textContent = '₹' + amount.toLocaleString('en-IN');
    document.getElementById('spDivisor').textContent = `÷ ${count} =`;
    document.getElementById('spEach').textContent = '₹' + each.toLocaleString('en-IN');
    document.getElementById('spMembersList').textContent = `Split equally among ${count} members (${names})`;
  } else if (count === 0) {
    preview.style.display = 'block';
    document.getElementById('spTotal').textContent = '₹' + amount.toLocaleString('en-IN');
    document.getElementById('spDivisor').textContent = '⚠️';
    document.getElementById('spEach').textContent = 'Select members';
    document.getElementById('spMembersList').textContent = 'Please select at least 1 participating member';
  } else {
    preview.style.display = 'none';
  }
}

// Wire up amount input after modal shows
document.getElementById('expenseModal').addEventListener('shown.bs.modal', () => {
  const amtEl = document.getElementById('expAmount');
  amtEl.removeEventListener('input', updateSplitPreview);
  amtEl.addEventListener('input', updateSplitPreview);
  updateSplitPreview();
});

// ─── Add Expense ───────────────────────────────────
function openAddExpense() {
  document.getElementById('expenseModalTitle').innerHTML = '<i class="fas fa-plus-circle me-2 text-primary"></i>Add Expense <small style="font-size:12px;color:var(--text-muted);font-weight:400">(Dynamic Split)</small>';
  document.getElementById('expenseId').value = '';
  document.getElementById('expenseForm').reset();
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];

  // Check all 4 members by default
  setSplitPreset([1,1,1,1]);

  document.getElementById('saveExpenseBtn').innerHTML = '<i class="fas fa-save me-1"></i>Save Expense';
  const p = document.getElementById('splitPreview');
  if (p) p.style.display = 'none';
  new bootstrap.Modal(document.getElementById('expenseModal')).show();
}

// ─── Edit Expense ──────────────────────────────────
async function openEditExpense(id) {
  const data = await api('/api/expenses/all');
  if (!data) return;
  const exp = data.data.find(e => e.id === id);
  if (!exp) return;

  document.getElementById('expenseModalTitle').innerHTML = '<i class="fas fa-edit me-2 text-warning"></i>Edit Expense';
  document.getElementById('expenseId').value = exp.id;
  document.getElementById('expTitle').value = exp.title;
  document.getElementById('expAmount').value = exp.amount;
  document.getElementById('expDate').value = exp.date;
  document.getElementById('expPaidBy').value = exp.paidBy;
  document.getElementById('expCategory').value = exp.category;
  document.getElementById('expDesc').value = exp.description || '';
  document.getElementById('expNotes').value = exp.notes || '';

  // Check the participating members
  const splitList = (Array.isArray(exp.splitBetween) && exp.splitBetween.length > 0) ? exp.splitBetween : ['192472374', '192472343', '192411184', '192411185'];
  const checks = document.querySelectorAll('.split-member-check');
  checks.forEach(chk => {
    chk.checked = splitList.includes(chk.value);
  });

  document.getElementById('saveExpenseBtn').innerHTML = '<i class="fas fa-save me-1"></i>Update Expense';
  new bootstrap.Modal(document.getElementById('expenseModal')).show();
}

// ─── Submit Expense ────────────────────────────────
async function submitExpense() {
  const id = document.getElementById('expenseId').value;
  const splitBetween = getSelectedSplitMembers();

  if (splitBetween.length === 0) {
    showToast('Validation Error', 'Please select at least 1 participating member to split with.', 'error');
    return;
  }

  const body = {
    title: document.getElementById('expTitle').value.trim(),
    amount: document.getElementById('expAmount').value,
    date: document.getElementById('expDate').value,
    paidBy: document.getElementById('expPaidBy').value,
    splitBetween,
    category: document.getElementById('expCategory').value,
    description: document.getElementById('expDesc').value.trim(),
    notes: document.getElementById('expNotes').value.trim()
  };

  if (!body.title || !body.amount || !body.date || !body.paidBy) {
    showToast('Validation Error', 'Please fill all required fields.', 'error');
    return;
  }

  const btn = document.getElementById('saveExpenseBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

  const url = id ? `/api/expenses/${id}` : '/api/expenses';
  const method = id ? 'PUT' : 'POST';
  const data = await api(url, { method, body: JSON.stringify(body) });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save me-1"></i>Save Expense';

  if (data && data.success) {
    bootstrap.Modal.getInstance(document.getElementById('expenseModal')).hide();
    showToast('Success', id ? 'Expense updated!' : 'Expense added!', 'success');
    fetchExpenses();
  } else {
    showToast('Error', data?.message || 'Failed to save expense.', 'error');
  }
}

// ─── Delete Expense ────────────────────────────────
function openDeleteExpense(id, name) {
  expensesState.deleteId = id;
  document.getElementById('deleteExpName').textContent = `"${name}"`;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!expensesState.deleteId) return;
  const data = await api(`/api/expenses/${expensesState.deleteId}`, { method: 'DELETE' });
  bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
  if (data && data.success) {
    showToast('Deleted', 'Expense removed successfully.', 'success');
    fetchExpenses();
  } else {
    showToast('Error', 'Failed to delete expense.', 'error');
  }
  expensesState.deleteId = null;
});
