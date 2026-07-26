/**
 * search.js – Global Search Functionality
 */

let searchDebounce = null;

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const q = e.target.value.trim();
    if (!q || q.length < 2) {
      searchResults.classList.remove('show');
      return;
    }
    searchDebounce = setTimeout(() => performSearch(q), 300);
  });

  searchInput.addEventListener('focus', (e) => {
    if (e.target.value.trim().length >= 2) searchResults.classList.add('show');
  });

  document.addEventListener('click', (e) => {
    if (!document.getElementById('globalSearchWrap').contains(e.target)) {
      searchResults.classList.remove('show');
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchResults.classList.remove('show');
      searchInput.value = '';
    }
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (q) {
        searchResults.classList.remove('show');
        searchInput.value = '';
        navigateTo('expenses');
        setTimeout(() => {
          const expSearch = document.getElementById('expSearch');
          if (expSearch) {
            expSearch.value = q;
            expensesState.search = q;
            expensesState.page = 1;
            fetchExpenses();
          }
        }, 300);
      }
    }
  });
});

async function performSearch(query) {
  const searchResults = document.getElementById('searchResults');
  searchResults.innerHTML = `
    <div class="search-result-item" style="color:var(--text-muted)">
      <i class="fas fa-spinner fa-spin"></i> Searching...
    </div>
  `;
  searchResults.classList.add('show');

  const data = await api(`/api/expenses?search=${encodeURIComponent(query)}&limit=6`);
  if (!data || !data.data) {
    searchResults.classList.remove('show');
    return;
  }

  if (data.data.length === 0) {
    searchResults.innerHTML = `
      <div class="search-result-item" style="color:var(--text-muted)">
        <i class="fas fa-search"></i>
        <span>No results for "<strong>${query}</strong>"</span>
      </div>
    `;
    return;
  }

  searchResults.innerHTML = data.data.map(e => `
    <div class="search-result-item" onclick="goToExpense('${query}')">
      <div class="avatar ${avatarClass(e.paidByName)}" style="width:28px;height:28px;border-radius:7px;font-size:10px">
        ${e.paidByName.substring(0,2).toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</div>
        <div style="font-size:11px;color:var(--text-muted)">${formatDate(e.date)} &bull; ${e.paidByName}</div>
      </div>
      <span style="font-weight:700;color:var(--primary);font-size:13px;flex-shrink:0">${formatCurrency(e.amount)}</span>
    </div>
  `).join('') + (data.meta.total > 6 ? `
    <div class="search-result-item" style="border-top:1px solid var(--glass-border);justify-content:center;color:var(--primary);font-weight:600;font-size:13px"
         onclick="goToExpense('${query}')">
      <i class="fas fa-search me-1"></i>View all ${data.meta.total} results
    </div>
  ` : '');
}

function goToExpense(query) {
  document.getElementById('searchResults').classList.remove('show');
  document.getElementById('globalSearch').value = '';
  navigateTo('expenses');
  setTimeout(() => {
    const expSearch = document.getElementById('expSearch');
    if (expSearch) {
      expSearch.value = query;
      expensesState.search = query;
      expensesState.page = 1;
      fetchExpenses();
    }
  }, 300);
}
