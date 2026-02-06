import { useState, useEffect } from "react";
import { transactionsAPI, reportsAPI, dashboardAPI } from "../services/api";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await dashboardAPI.getSummary();
      setSummary(res.data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await reportsAPI.exportPDF(dateRange);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-keuangan-${dateRange.start_date}-${dateRange.end_date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Gagal mengekspor PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await reportsAPI.exportExcel(dateRange);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-keuangan-${dateRange.start_date}-${dateRange.end_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Gagal mengekspor Excel");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Laporan</h2>
          <p className="text-muted">Export data keuanganmu</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">Pilih Rentang Tanggal</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Dari Tanggal</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange({ ...dateRange, start_date: e.target.value })
              }
            />
          </div>
          <div>
            <label className="form-label">Sampai Tanggal</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange({ ...dateRange, end_date: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 mb-6">
        <div
          className="stat-card"
          style={{ "--stat-color": "var(--gradient-primary)" }}
        >
          <div className="stat-card-icon">💰</div>
          <div className="stat-card-label">Total Saldo</div>
          <div className="stat-card-value">
            {formatCurrency(summary?.totalBalance || 0)}
          </div>
        </div>

        <div
          className="stat-card"
          style={{ "--stat-color": "var(--gradient-success)" }}
        >
          <div
            className="stat-card-icon"
            style={{ background: "rgba(34, 197, 94, 0.15)" }}
          >
            📈
          </div>
          <div className="stat-card-label">Total Pemasukan Bulan Ini</div>
          <div className="stat-card-value text-success">
            {formatCurrency(summary?.monthlyIncome || 0)}
          </div>
        </div>

        <div
          className="stat-card"
          style={{ "--stat-color": "var(--gradient-danger)" }}
        >
          <div
            className="stat-card-icon"
            style={{ background: "rgba(239, 68, 68, 0.15)" }}
          >
            📉
          </div>
          <div className="stat-card-label">Total Pengeluaran Bulan Ini</div>
          <div className="stat-card-value text-danger">
            {formatCurrency(summary?.monthlyExpense || 0)}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="card">
        <h3 className="card-title mb-4">Export Laporan</h3>
        <p className="text-muted mb-6">
          Download laporan keuanganmu dalam format PDF atau Excel
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div
            className="card"
            style={{
              background:
                "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={handleExportPDF}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-xl)",
                  background: "rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                }}
              >
                📄
              </div>
              <div>
                <div
                  style={{ fontSize: "var(--font-size-xl)", fontWeight: 700 }}
                >
                  Export PDF
                </div>
                <div className="text-muted">
                  Download laporan dalam format PDF
                </div>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={handleExportExcel}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-xl)",
                  background: "rgba(34, 197, 94, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                }}
              >
                📊
              </div>
              <div>
                <div
                  style={{ fontSize: "var(--font-size-xl)", fontWeight: 700 }}
                >
                  Export Excel
                </div>
                <div className="text-muted">
                  Download laporan dalam format Excel
                </div>
              </div>
            </div>
          </div>
        </div>

        {exporting && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <div
              className="loading-spinner"
              style={{ width: 24, height: 24 }}
            ></div>
            <span>Sedang mengexport...</span>
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      {summary?.monthlyTrend && (
        <div className="card mt-6">
          <h3 className="card-title mb-4">Tren 6 Bulan Terakhir</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th>Pemasukan</th>
                  <th>Pengeluaran</th>
                  <th>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthlyTrend.map((item, index) => (
                  <tr key={index}>
                    <td>{item.month}</td>
                    <td className="text-success">
                      {formatCurrency(item.income)}
                    </td>
                    <td className="text-danger">
                      {formatCurrency(item.expense)}
                    </td>
                    <td
                      className={
                        item.income - item.expense >= 0
                          ? "text-success"
                          : "text-danger"
                      }
                    >
                      {formatCurrency(item.income - item.expense)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
