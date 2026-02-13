# Money Tracker - Fullstack Financial Application

Aplikasi pencatatan keuangan pribadi dengan fitur lengkap.

## Fitur

- ✅ Login & Register dengan JWT Authentication
- ✅ Multi-wallet (Cash, Bank, E-Wallet)
- ✅ Kategori transaksi kustom
- ✅ Catat pemasukan & pengeluaran
- ✅ Dashboard dengan grafik visualisasi
- ✅ Budget planning per kategori
- ✅ Export laporan PDF & Excel

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Charts**: Chart.js

## Cara Menjalankan

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Jalankan Backend

```bash
cd backend
npm run dev
```

Server berjalan di `http://localhost:3001`

### 3. Jalankan Frontend

```bash
cd frontend
npm run dev
```

Aplikasi berjalan di `http://localhost:5173`

## Struktur Folder

```
money-tracker/
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── middleware/auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── wallets.js
│   │   │   ├── categories.js
│   │   │   ├── transactions.js
│   │   │   ├── budgets.js
│   │   │   ├── dashboard.js
│   │   │   └── reports.js
│   │   └── index.js
│   ├── data/database.sqlite
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/layout/Layout.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Wallets.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── Budgets.jsx
│   │   │   └── Reports.jsx
│   │   ├── services/api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
└── README.md
```

## API Endpoints

| Method              | Endpoint                    | Description           |
| ------------------- | --------------------------- | --------------------- |
| POST                | `/api/auth/register`        | Register user baru    |
| POST                | `/api/auth/login`           | Login user            |
| GET                 | `/api/auth/me`              | Get current user      |
| GET/POST/PUT/DELETE | `/api/wallets`              | CRUD wallets          |
| POST                | `/api/wallets/transfer`     | Transfer antar wallet |
| GET/POST/PUT/DELETE | `/api/categories`           | CRUD categories       |
| GET/POST/PUT/DELETE | `/api/transactions`         | CRUD transactions     |
| GET/POST/PUT/DELETE | `/api/budgets`              | CRUD budgets          |
| GET                 | `/api/dashboard/summary`    | Get dashboard data    |
| GET                 | `/api/reports/export/pdf`   | Export PDF            |
| GET                 | `/api/reports/export/excel` | Export Excel          |
