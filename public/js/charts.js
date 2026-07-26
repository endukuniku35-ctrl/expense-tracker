/**
 * charts.js – Charts View with Chart.js
 */

async function loadCharts() {
  const content = document.getElementById('viewContent');
  content.innerHTML = `
    <div style="animation:fadeInUp 0.4s ease">
      <div class="row g-3">
        <!-- Pie: Category -->
        <div class="col-lg-6">
          <div class="glass-card">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-chart-pie"></i></div>
                Expense by Category
              </h3>
            </div>
            <div class="card-body-custom">
              <div class="chart-wrapper" style="height:300px"><canvas id="chartCatPie"></canvas></div>
            </div>
          </div>
        </div>

        <!-- Doughnut: Member Contribution -->
        <div class="col-lg-6">
          <div class="glass-card">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-users"></i></div>
                Member Contribution
              </h3>
            </div>
            <div class="card-body-custom">
              <div class="chart-wrapper" style="height:300px"><canvas id="chartMemberDoughnut"></canvas></div>
            </div>
          </div>
        </div>

        <!-- Line: Monthly Trend -->
        <div class="col-12">
          <div class="glass-card">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-chart-line"></i></div>
                Monthly Expense Trend (Last 6 Months)
              </h3>
            </div>
            <div class="card-body-custom">
              <div class="chart-wrapper" style="height:280px"><canvas id="chartMonthlyLine"></canvas></div>
            </div>
          </div>
        </div>

        <!-- Bar: Weekly -->
        <div class="col-lg-6">
          <div class="glass-card">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-chart-bar"></i></div>
                Weekly Expense (Last 4 Weeks)
              </h3>
            </div>
            <div class="card-body-custom">
              <div class="chart-wrapper" style="height:260px"><canvas id="chartWeeklyBar"></canvas></div>
            </div>
          </div>
        </div>

        <!-- Bar: Bills Paid vs Fair Share -->
        <div class="col-lg-6">
          <div class="glass-card">
            <div class="card-header-custom">
              <h3 class="card-title-custom">
                <div class="card-title-icon"><i class="fas fa-balance-scale"></i></div>
                Bills Paid vs Fair Share
              </h3>
            </div>
            <div class="card-body-custom">
              <div class="chart-wrapper" style="height:260px"><canvas id="chartPaymentBar"></canvas></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const data = await api('/api/dashboard/charts');
  if (!data || !data.charts) return;

  const { charts } = data;
  const memberColors = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04'];
  const catColors = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#00bcd4', '#7c4dff', '#ff9800'];

  // Destroy old charts
  ['chartCatPie','chartMemberDoughnut','chartMonthlyLine','chartWeeklyBar','chartPaymentBar'].forEach(id => {
    if (App.charts[id]) App.charts[id].destroy();
  });

  const chartDefaults = {
    plugins: { legend: { labels: { font: { family: 'Outfit', size: 12 }, color: '#8b949e', padding: 16 } } }
  };

  // 1. Category Pie
  App.charts['chartCatPie'] = new Chart(document.getElementById('chartCatPie').getContext('2d'), {
    type: 'pie',
    data: {
      labels: charts.categoryPie.labels,
      datasets: [{ data: charts.categoryPie.data, backgroundColor: catColors, borderWidth: 2, borderColor: 'var(--surface)', hoverOffset: 10 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...chartDefaults.plugins,
        legend: { ...chartDefaults.plugins.legend, position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}` } }
      }
    }
  });

  // 2. Member Doughnut
  App.charts['chartMemberDoughnut'] = new Chart(document.getElementById('chartMemberDoughnut').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: charts.memberDoughnut.labels,
      datasets: [{ data: charts.memberDoughnut.data, backgroundColor: memberColors, borderWidth: 2, borderColor: 'var(--surface)', hoverOffset: 10 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        ...chartDefaults.plugins,
        legend: { ...chartDefaults.plugins.legend, position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}` } }
      }
    }
  });

  // 3. Monthly Line
  App.charts['chartMonthlyLine'] = new Chart(document.getElementById('chartMonthlyLine').getContext('2d'), {
    type: 'line',
    data: {
      labels: charts.monthlyLine.labels.map(l => {
        const [y, m] = l.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      }),
      datasets: [{
        label: 'Monthly Expense (₹)',
        data: charts.monthlyLine.data,
        borderColor: '#1a73e8',
        backgroundColor: createGradient,
        borderWidth: 3,
        pointRadius: 6,
        pointBackgroundColor: '#1a73e8',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 10,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 12 },
          callbacks: { label: ctx => ' ₹' + ctx.raw.toLocaleString('en-IN') }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b949e', font: { family: 'Outfit' } } },
        y: {
          grid: { color: 'rgba(138,148,158,0.1)' },
          ticks: { color: '#8b949e', font: { family: 'Outfit' }, callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) }
        }
      }
    }
  });

  // 4. Weekly Bar
  App.charts['chartWeeklyBar'] = new Chart(document.getElementById('chartWeeklyBar').getContext('2d'), {
    type: 'bar',
    data: {
      labels: charts.weeklyBar.labels,
      datasets: [{
        label: 'Weekly Expense (₹)',
        data: charts.weeklyBar.data,
        backgroundColor: ['rgba(26,115,232,0.7)', 'rgba(52,168,83,0.7)', 'rgba(251,188,4,0.7)', 'rgba(234,67,53,0.7)'],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => '₹' + ctx.raw.toLocaleString('en-IN') } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b949e', font: { family: 'Outfit' } } },
        y: {
          grid: { color: 'rgba(138,148,158,0.1)' },
          ticks: { color: '#8b949e', font: { family: 'Outfit' }, callback: v => '₹' + v.toLocaleString('en-IN') }
        }
      }
    }
  });

  // 5. Bills Paid vs Fair Share per member
  App.charts['chartPaymentBar'] = new Chart(document.getElementById('chartPaymentBar').getContext('2d'), {
    type: 'bar',
    data: {
      labels: charts.balanceBar.map(b => b.name),
      datasets: [
        {
          label: 'Bills Paid (₹)',
          data: charts.balanceBar.map(b => b.totalPaid),
          backgroundColor: 'rgba(26,115,232,0.75)',
          borderRadius: 8, borderSkipped: false
        },
        {
          label: 'Fair Share (₹)',
          data: charts.balanceBar.map(b => b.fairShare),
          backgroundColor: 'rgba(52,168,83,0.65)',
          borderRadius: 8, borderSkipped: false,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        ...chartDefaults.plugins,
        legend: { ...chartDefaults.plugins.legend, position: 'top' },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b949e', font: { family: 'Outfit' } } },
        y: { grid: { color: 'rgba(138,148,158,0.1)' }, ticks: { color: '#8b949e', font: { family: 'Outfit' }, callback: v => '₹' + v.toLocaleString('en-IN') } }
      }
    }
  });
}

// Gradient helper for line chart fill
function createGradient(ctx) {
  if (!ctx || !ctx.chart) return 'rgba(26,115,232,0.1)';
  const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
  gradient.addColorStop(0, 'rgba(26,115,232,0.25)');
  gradient.addColorStop(1, 'rgba(26,115,232,0)');
  return gradient;
}
