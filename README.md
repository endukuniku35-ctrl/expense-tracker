# 🍛 Curry Expense Tracker

A modern, full-stack web application to track curry expenses among four members.

## 🚀 Quick Start

```bash
# 1. Navigate to project folder
cd "expense tracker"

# 2. Install dependencies (only once)
npm install

# 3. Start the server
npm start

# 4. Open your browser
# http://localhost:3000
```

## 🔐 Login Credentials

| Name | User ID | Password | Role |
|------|---------|----------|------|
| Jagan Kandukuri | 192472374 | kandukurijagan@14062020 | 👑 Admin |
| Sagar Nallamala | 192472343 | nallamalasagar | 👤 Member |
| Prathap Kumar | 192411184 | prathap | 👤 Member |
| Bharath Reddy | 192411185 | bharath | 👤 Member |

## 📁 Project Structure

```
expense tracker/
├── server.js              # Express app entry point
├── package.json
├── db.mysql.js            # Optional MySQL integration
├── data/
│   ├── init.js            # Data initialization
│   ├── users.json         # Users (auto-created)
│   ├── expenses.json      # Expenses (auto-created, 13 samples)
│   ├── payments.json      # Payment records (auto-created)
│   └── notifications.json # Notifications (auto-created)
├── routes/
│   ├── auth.js            # Login/logout
│   ├── expenses.js        # Expense CRUD
│   ├── payments.js        # Payment management
│   ├── reports.js         # Reports & exports
│   ├── dashboard.js       # Stats & charts data
│   ├── members.js         # Members listing
│   └── notifications.js   # Notifications
├── middleware/
│   └── auth.js            # Auth & admin guards
└── public/
    ├── index.html         # Login page
    ├── dashboard.html     # Main SPA
    ├── css/
    │   └── style.css      # Global styles
    └── js/
        ├── app.js         # SPA router & utilities
        ├── dashboard.js   # Dashboard view
        ├── members.js     # Members view
        ├── expenses.js    # Expenses CRUD view
        ├── payments.js    # Payment tracking view
        ├── reports.js     # Reports & exports view
        ├── charts.js      # Chart.js visualizations
        ├── profile.js     # Profile view
        ├── notifications.js # Notifications
        └── search.js      # Global search
```

## ✨ Features

### Dashboard
- Animated stat cards (Total Expense, Paid, Pending, Members, Today, Month)
- Monthly trend line chart
- Category pie chart
- Recent expenses table
- Member payment status

### Members
- Full member table with contribution tracking
- Per-person share calculation
- Payment progress bars
- Individual member cards

### Expense Management (Admin)
- Add, edit, delete expenses
- Searchable & filterable table
- Sort by date/amount
- Filter by month, member, category
- Pagination

### Payment Tracking
- Per-member payment cards
- Progress bars
- Net balance calculation
- Admin update modal

### Reports
- Monthly/Member/Category reports
- Export to **CSV, Excel, PDF**
- Print support

### Charts
- Pie: Expense by category
- Doughnut: Member contribution
- Line: Monthly trend
- Bar: Weekly expenses
- Bar: Paid vs Pending

## 🔒 Security

- bcrypt password hashing
- Session-based authentication
- Server-side admin guards
- Read-only users cannot bypass via API

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, express-session
- **Auth**: bcryptjs
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JS
- **Charts**: Chart.js 4
- **Storage**: JSON files (default) / MySQL (optional)
- **Exports**: pdfkit, exceljs, json2csv
