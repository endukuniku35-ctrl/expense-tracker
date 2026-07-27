/**
 * profile.js – Profile View
 */

window.loadProfile = function loadProfile() {
  const content = document.getElementById('viewContent');
  const user = App.currentUser;
  if (!user) return;

  const memberColors = {
    '192472374': ['#1a73e8', '#0d5cb8'],
    '192472343': ['#34a853', '#1e7e34'],
    '192411184': ['#ea4335', '#c5221f'],
    '192411185': ['#fbbc04', '#e37400']
  };
  const colors = memberColors[user.userid] || ['#1a73e8', '#0d5cb8'];

  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease;max-width:700px;margin:0 auto">
      <!-- Profile Hero -->
      <div class="glass-card mb-4" style="overflow:visible">
        <div style="background:linear-gradient(135deg, ${colors[0]}, ${colors[1]});height:140px;border-radius:20px 20px 0 0;position:relative">
          ${user.userid === '192472374' || user.role === 'admin' ? `
            <!-- Jagan's real photo - visible to all users -->
            <div style="position:absolute;bottom:-46px;left:28px">
              <div style="position:relative;width:92px;height:92px">
                <div style="position:absolute;inset:-4px;border-radius:24px;background:linear-gradient(135deg,${colors[0]},${colors[1]});opacity:0.6;filter:blur(6px)"></div>
                <img src="/images/jagan.jpg?v=622" alt="Jagan Kandukuri"
                  style="position:relative;width:92px;height:92px;border-radius:22px;object-fit:cover;object-position:center top;border:4px solid var(--surface);box-shadow:0 8px 32px rgba(0,0,0,0.35)" />
                <div style="position:absolute;bottom:2px;right:2px;width:18px;height:18px;background:#34a853;border-radius:50%;border:3px solid var(--surface)"></div>
              </div>
            </div>
          ` : `
            <div style="position:absolute;bottom:-36px;left:28px">
              <div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,${colors[0]},${colors[1]});
                          display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;
                          border:4px solid var(--surface);box-shadow:0 8px 24px rgba(0,0,0,0.15)">
                ${(user.name || '?').substring(0,2).toUpperCase()}
              </div>
            </div>
          `}
          ${user.role === 'admin' ? `
            <div style="position:absolute;top:12px;right:16px">
              <span style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);
                           color:#fff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;backdrop-filter:blur(8px)">
                👑 Administrator
              </span>
            </div>
          ` : ''}
        </div>

        <div style="padding:52px 28px 28px">
          <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">${user.name}</h2>
          <div style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">
            <i class="fas fa-id-card me-1"></i>ID: ${user.userid} &bull; 
            <i class="fas fa-calendar me-1"></i>Member since ${formatDate(user.joinDate)}
          </div>

          <!-- Info Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
            <div style="background:var(--bg-2);border-radius:12px;padding:16px">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Full Name</div>
              <div style="font-weight:600;color:var(--text-primary)">${user.name}</div>
            </div>
            <div style="background:var(--bg-2);border-radius:12px;padding:16px">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">User ID</div>
              <div style="font-weight:600;font-family:monospace;color:var(--text-primary)">${user.userid}</div>
            </div>
            <div style="background:var(--bg-2);border-radius:12px;padding:16px">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Role</div>
              <div style="font-weight:600;color:${user.role === 'admin' ? 'var(--primary)' : 'var(--secondary)'}">
                ${user.role === 'admin' ? '👑 Administrator' : '👤 Member'}
              </div>
            </div>
            <div style="background:var(--bg-2);border-radius:12px;padding:16px">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Access Level</div>
              <div style="font-weight:600;color:var(--text-primary)">
                ${user.role === 'admin' ? 'Full Access' : 'Read-Only'}
              </div>
            </div>
          </div>

          <!-- Permissions -->
          <div style="background:var(--bg-2);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:12px">
              <i class="fas fa-shield-alt me-1"></i>Permissions
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              ${getPermissions(user.role).map(p => `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:${p.allowed ? 'var(--secondary)' : 'var(--text-muted)'}">
                  <i class="fas ${p.allowed ? 'fa-check-circle' : 'fa-times-circle'}" style="font-size:14px"></i>
                  ${p.label}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Logout Button -->
      <div class="text-center">
        <button class="btn-danger-custom" onclick="showLogoutModal()" style="padding:12px 32px;font-size:15px">
          <i class="fas fa-sign-out-alt me-2"></i>Logout
        </button>
      </div>
    </div>
  `;
}

function getPermissions(role) {
  const allPerms = [
    { label: 'View Dashboard', admin: true, member: true },
    { label: 'View Expenses', admin: true, member: true },
    { label: 'View Reports', admin: true, member: true },
    { label: 'View Charts', admin: true, member: true },
    { label: 'Add Expense', admin: true, member: false },
    { label: 'Edit Expense', admin: true, member: false },
    { label: 'Delete Expense', admin: true, member: false },
    { label: 'Update Payments', admin: true, member: false },
    { label: 'Export Reports', admin: true, member: true },
    { label: 'Admin Dashboard', admin: true, member: false },
    { label: 'Manage Records', admin: true, member: false },
    { label: 'View Notifications', admin: true, member: false },
  ];
  return allPerms.map(p => ({ label: p.label, allowed: role === 'admin' ? p.admin : p.member }));
}
