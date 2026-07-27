/**
 * inventory.js – Household Grocery & Inventory Controller with AI Prediction
 */

window.loadInventoryView = async function loadInventoryView() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-boxes"></i></div>
            Household Inventory & Grocery Depletion Tracker
          </h3>
          ${App.isAdmin ? `
            <button class="btn-primary-custom" onclick="openAddInventoryModal()">
              <i class="fas fa-plus me-1"></i>Add Grocery Item
            </button>
          ` : ''}
        </div>
        <div id="inventoryContent" class="card-body-custom">
          <div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading inventory items...</div>
        </div>
      </div>
    </div>
  `;

  const res = await api('/api/inventory');
  const body = document.getElementById('inventoryContent');
  if (!res || !res.success || !body) return;

  const items = res.data || [];

  body.innerHTML = `
    <div class="row g-3">
      ${items.map(item => {
        const isLow = item.remainingDays <= 2;
        const color = isLow ? '#ea4335' : (item.remainingDays <= 4 ? '#fbbc04' : '#34a853');
        return `
          <div class="col-md-4 col-sm-6">
            <div style="background:var(--surface);border:1px solid ${isLow ? 'rgba(234,67,53,0.3)' : 'var(--glass-border)'};border-top:3px solid ${color};border-radius:14px;padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-weight:800;font-size:16px;color:var(--text-primary)">${item.name}</div>
                <span class="badge" style="background:${color};color:#fff;font-weight:700">${item.quantity} ${item.unit}</span>
              </div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
                Last Purchased: <strong>${item.lastPurchased || 'N/A'}</strong>
              </div>
              <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px 10px;font-size:12px;color:${color};font-weight:600">
                🤖 AI Suggestion: ${item.suggestion}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

window.openAddInventoryModal = function openAddInventoryModal() {
  const name = prompt('Grocery Item Name (e.g. Cooking Oil):');
  if (!name) return;
  const quantity = prompt('Quantity (e.g. 2):', '1');
  const unit = prompt('Unit (e.g. kg, L, pack):', 'kg');
  const remainingDays = prompt('Estimated remaining days:', '3');

  if (name && quantity) {
    api('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({ name, quantity: parseFloat(quantity), unit, remainingDays: parseInt(remainingDays) })
    }).then(res => {
      if (res && res.success) {
        showToast('Item Added 🛒', res.message, 'success');
        loadInventoryView();
      }
    });
  }
};
