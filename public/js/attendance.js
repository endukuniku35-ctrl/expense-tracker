/**
 * attendance.js – Daily Meal Attendance Sheet (Breakfast, Lunch, Dinner)
 */

window.loadAttendanceView = async function loadAttendanceView() {
  const content = document.getElementById('viewContent');
  const today = new Date().toISOString().split('T')[0];

  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="glass-card mb-4">
        <div class="card-header-custom">
          <h3 class="card-title-custom">
            <div class="card-title-icon"><i class="fas fa-utensil-spoon"></i></div>
            Daily Meal Attendance Matrix
          </h3>
          <input type="date" id="attendanceDate" value="${today}" onchange="loadAttendanceMatrix(this.value)" class="form-control-custom" style="width:160px;font-size:13px" />
        </div>
        <div id="attendanceContent" class="card-body-custom">
          <div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="loader-spinner" style="margin:0 auto 12px"></div>Loading attendance matrix...</div>
        </div>
      </div>
    </div>
  `;

  loadAttendanceMatrix(today);
};

window.loadAttendanceMatrix = async function loadAttendanceMatrix(date) {
  const body = document.getElementById('attendanceContent');
  if (!body) return;

  const res = await api(`/api/attendance?date=${date}`);
  if (!res || !res.success) return;

  const { members, attendance } = res;
  const meals = [
    { key: 'breakfast', title: '🍳 Breakfast' },
    { key: 'lunch', title: '🍛 Lunch' },
    { key: 'dinner', title: '🍲 Dinner' }
  ];

  body.innerHTML = `
    <div class="table-responsive">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Member</th>
            ${meals.map(m => `<th>${m.title}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${members.map(m => `
            <tr>
              <td style="font-weight:700;color:var(--text-primary)">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="avatar ${avatarClass(m.shortName)}">${m.avatar || '👤'}</div>
                  <span>${m.name}</span>
                </div>
              </td>
              ${meals.map(meal => {
                const isAttending = (attendance[meal.key] || []).includes(m.userid);
                return `
                  <td>
                    <button class="btn-ghost" style="padding:4px 12px;font-size:16px" onclick="toggleMealAttendance('${date}', '${meal.key}', '${m.userid}')">
                      ${isAttending ? '✅ <span style="font-size:12px;color:#34a853">Attending</span>' : '❌ <span style="font-size:12px;color:#ea4335">Absent</span>'}
                    </button>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

window.toggleMealAttendance = async function toggleMealAttendance(date, mealType, userid) {
  const res = await api(`/api/attendance?date=${date}`);
  if (!res || !res.success) return;

  let currentList = res.attendance[mealType] || [];
  if (currentList.includes(userid)) {
    currentList = currentList.filter(id => id !== userid);
  } else {
    currentList.push(userid);
  }

  const saveRes = await api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({ date, mealType, attendees: currentList })
  });

  if (saveRes && saveRes.success) {
    showToast('Attendance Updated', `${mealType.toUpperCase()} attendance saved.`, 'success', 2000);
    loadAttendanceMatrix(date);
  }
};
