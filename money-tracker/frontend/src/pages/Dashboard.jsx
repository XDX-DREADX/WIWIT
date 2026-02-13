import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { dashboardAPI, transactionsAPI } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import WeatherWidget from "../components/widgets/WeatherWidget";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const DetailModal = ({
  show,
  title,
  onClose,
  transactions,
  loading,
  currencyFormatter,
  language,
}) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div
          className="modal-body"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : transactions.length > 0 ? (
            <div className="transaction-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div
                    className="transaction-icon"
                    style={{ background: `${tx.category?.color || '#6366f1'}20` }}
                  >
                    {tx.category?.icon}
                  </div>
                  <div className="transaction-info">
                    <div className="transaction-category">
                      {tx.category?.name}
                    </div>
                    <div className="transaction-description">
                      {tx.description || tx.wallet?.name}
                    </div>
                  </div>
                  <div className="transaction-meta">
                    <div className={`transaction-amount ${tx.type}`}>
                      {tx.type === "income" ? "+" : "-"}{" "}
                      {currencyFormatter(tx.amount)}
                    </div>
                    <div className="transaction-date">
                      {new Date(tx.date).toLocaleDateString(
                        language === "id" ? "id-ID" : "en-US",
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-muted">Tidak ada data detail</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailModal, setDetailModal] = useState({
    show: false,
    title: "",
    transactions: [],
    loading: false,
  });

  useEffect(() => {
    fetchDashboard();
  }, [language]);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getSummary();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchDetails = async (filters, title) => {
    setDetailModal({ show: true, title, transactions: [], loading: true });
    try {
      const now = new Date();
      const start_date = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const params = { ...filters };
      if (!params.start_date) params.start_date = start_date;
      if (!params.end_date) params.end_date = end_date;
      params.limit = 100;

      const res = await transactionsAPI.getAll(params);
      setDetailModal((prev) => ({
        ...prev,
        transactions: res.data,
        loading: false,
      }));
    } catch (err) {
      console.error(err);
      setDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStatClick = (type, title) => {
    fetchDetails({ type }, `${title} (${t("this_month") || "Bulan Ini"})`);
  };

  const handleWalletClick = (walletId, walletName) => {
    fetchDetails({ wallet_id: walletId }, `Transaksi: ${walletName}`);
  };

  const handleDoughnutClick = (event, elements, chartData, type) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      if (type === "expense_category") {
        const category = data.spendingByCategory[index];
        if (category) {
          fetchDetails(
            { category_id: category.id, type: "expense" },
            `Pengeluaran: ${category.name}`,
          );
        }
      } else if (type === "income_vs_expense") {
        const label = index === 0 ? "income" : "expense";
        fetchDetails(
          { type: label },
          `Detail ${label === "income" ? t("income") : t("expense")}`,
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  const incomeExpenseData = {
    labels: [t("income"), t("expense")],
    datasets: [
      {
        data: [data.totalIncome, data.totalExpense],
        backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(239, 68, 68, 0.8)"],
        borderColor: ["#22c55e", "#ef4444"],
        borderWidth: 2,
      },
    ],
  };

  const spendingByCategoryData = {
    labels: data.expensesByCategory?.map((c) => c.name) || [],
    datasets: [
      {
        data: data.expensesByCategory?.map((c) => c.total) || [],
        backgroundColor: data.expensesByCategory?.map((c) => c.color) || [],
        borderWidth: 0,
      },
    ],
  };

  const dailyTrendData = {
    labels:
      data.dailyTrend?.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString(language === "id" ? "id-ID" : "en-US", {
          weekday: "short",
        });
      }) || [],
    datasets: [
      {
        label: t("income"),
        data: data.dailyTrend?.map((d) => d.income) || [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: t("expense"),
        data: data.dailyTrend?.map((d) => d.expense) || [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#a0aec0", padding: 20 } },
    },
  };

  const interactionOptions = {
    ...chartOptions,
    onClick: (evt, elements) =>
      handleDoughnutClick(evt, elements, null, "income_vs_expense"),
    cursor: "pointer",
  };

  const categoryOptions = {
    ...chartOptions,
    onClick: (evt, elements) =>
      handleDoughnutClick(evt, elements, null, "expense_category"),
    cursor: "pointer",
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#a0aec0" },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#a0aec0" },
      },
    },
  };

  return (
    <div className="page-content-animated bento-grid">
      {/* Weather Widget (Full Width) */}
      <div className="bento-col-4">
        <WeatherWidget />
      </div>

      {/* Stats Cards (4x1) */}
      <div
        className="stat-card bento-col-1"
        style={{ "--stat-color": "var(--gradient-primary)", cursor: "pointer" }}
        onClick={() => handleStatClick(null, "Total Saldo")}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="stat-card-label">{t("total_balance")}</div>
            <div className="stat-card-value" style={{ fontSize: "1.2rem" }}>
              {formatCurrency(data.totalBalance)}
            </div>
          </div>
          <div
            className="stat-card-icon"
            style={{ width: 32, height: 32, fontSize: "1rem", margin: 0 }}
          >
            💰
          </div>
        </div>
      </div>

      <div
        className="stat-card bento-col-1"
        style={{ "--stat-color": "var(--gradient-success)", cursor: "pointer" }}
        onClick={() => handleStatClick("income", t("income"))}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="stat-card-label">{t("income")}</div>
            <div
              className="stat-card-value text-success"
              style={{ fontSize: "1.2rem" }}
            >
              {formatCurrency(data.totalIncome)}
            </div>
          </div>
          <div
            className="stat-card-icon"
            style={{
              background: "rgba(34, 197, 94, 0.15)",
              width: 32,
              height: 32,
              fontSize: "1rem",
              margin: 0,
            }}
          >
            📈
          </div>
        </div>
      </div>

      <div
        className="stat-card bento-col-1"
        style={{ "--stat-color": "var(--gradient-danger)", cursor: "pointer" }}
        onClick={() => handleStatClick("expense", t("expense"))}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="stat-card-label">{t("expense")}</div>
            <div
              className="stat-card-value text-danger"
              style={{ fontSize: "1.2rem" }}
            >
              {formatCurrency(data.totalExpense)}
            </div>
          </div>
          <div
            className="stat-card-icon"
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              width: 32,
              height: 32,
              fontSize: "1rem",
              margin: 0,
            }}
          >
            📉
          </div>
        </div>
      </div>

      <div className="stat-card bento-col-1">
        <div className="flex justify-between items-start">
          <div>
            <div className="stat-card-label">Net</div>
            <div
              className={`stat-card-value ${(data.totalIncome - data.totalExpense) >= 0 ? "text-success" : "text-danger"}`}
              style={{ fontSize: "1.2rem" }}
            >
              {formatCurrency(data.totalIncome - data.totalExpense)}
            </div>
          </div>
          <div
            className="stat-card-icon"
            style={{ width: 32, height: 32, fontSize: "1rem", margin: 0 }}
          >
            📊
          </div>
        </div>
      </div>

      {/* Doughnut Charts */}
      <div className="card bento-col-2" style={{ minHeight: "300px" }}>
        <div className="card-header">
          <h3 className="card-title">
            {t("income")} vs {t("expense")}
          </h3>
        </div>
        <div className="chart-container" style={{ height: "200px" }}>
          <Doughnut data={incomeExpenseData} options={interactionOptions} />
        </div>
      </div>

      <div className="card bento-col-2" style={{ minHeight: "300px" }}>
        <div className="card-header">
          <h3 className="card-title">
            {t("expense")} / {t("category")}
          </h3>
        </div>
        <div className="chart-container" style={{ height: "200px" }}>
          {data.expensesByCategory?.length > 0 ? (
            <Doughnut data={spendingByCategoryData} options={categoryOptions} />
          ) : (
            <div className="empty-state">
              <p className="text-muted">{t("no_transactions")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Trend Chart (Wide) */}
      <div className="card bento-col-4">
        <div className="card-header">
          <h3 className="card-title">Trend 7 Hari</h3>
        </div>
        <div className="chart-container" style={{ height: "250px" }}>
          <Line data={dailyTrendData} options={lineChartOptions} />
        </div>
      </div>

      {/* Wallets (Tall) */}
      <div className="card bento-col-2 bento-row-2">
        <div className="card-header">
          <h3 className="card-title">{t("wallets")}</h3>
        </div>
        <div
          className="flex flex-col gap-3"
          style={{ maxHeight: "400px", overflowY: "auto" }}
        >
          {data.wallets?.map((wallet) => (
            <div
              key={wallet.id}
              className="wallet-card"
              style={{
                "--wallet-color": wallet.color,
                cursor: "pointer",
                padding: "1rem",
              }}
              onClick={() => handleWalletClick(wallet.id, wallet.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="wallet-card-icon"
                    style={{
                      background: `${wallet.color}20`,
                      width: 36,
                      height: 36,
                      fontSize: "1rem",
                    }}
                  >
                    {wallet.icon}
                  </div>
                  <div>
                    <div
                      className="wallet-card-name"
                      style={{ fontSize: "0.9rem" }}
                    >
                      {wallet.name}
                    </div>
                    <div
                      className="wallet-card-type"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {wallet.type}
                    </div>
                  </div>
                </div>
                <div className="font-bold" style={{ fontSize: "0.9rem" }}>
                  {formatCurrency(wallet.balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tx (Tall) */}
      <div className="card bento-col-2 bento-row-2">
        <div className="card-header">
          <h3 className="card-title">{t("recent_transactions")}</h3>
        </div>
        <div
          className="transaction-list"
          style={{ maxHeight: "400px", overflowY: "auto" }}
        >
          {data.recentTransactions?.length > 0 ? (
            data.recentTransactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="transaction-item"
                style={{ padding: "0.8rem" }}
              >
                <div
                  className="transaction-icon"
                  style={{
                    background: `${tx.category?.color || '#6366f1'}20`,
                    width: 36,
                    height: 36,
                    fontSize: "1rem",
                  }}
                >
                  {tx.category?.icon}
                </div>
                <div className="transaction-info">
                  <div
                    className="transaction-category"
                    style={{ fontSize: "0.9rem" }}
                  >
                    {tx.category?.name}
                  </div>
                  <div
                    className="transaction-description"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {tx.description || tx.wallet?.name}
                  </div>
                </div>
                <div className="transaction-meta">
                  <div
                    className={`transaction-amount ${tx.type}`}
                    style={{ fontSize: "0.9rem" }}
                  >
                    {tx.type === "income" ? "+" : "-"}{" "}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">{t("no_transactions")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal
        show={detailModal.show}
        title={detailModal.title}
        transactions={detailModal.transactions}
        loading={detailModal.loading}
        onClose={() => setDetailModal((prev) => ({ ...prev, show: false }))}
        currencyFormatter={formatCurrency}
        language={language}
      />
    </div>
  );
}
