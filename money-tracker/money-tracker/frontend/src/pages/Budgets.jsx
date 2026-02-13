import { useState, useEffect } from "react";
import { budgetsAPI, categoriesAPI } from "../services/api";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    category_id: "",
    amount: "",
    period: "monthly",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budgetRes, catRes] = await Promise.all([
        budgetsAPI.getAll(),
        categoriesAPI.getAll("expense"),
      ]);
      setBudgets(budgetRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
      };

      if (editingId) {
        await budgetsAPI.update(editingId, payload);
      } else {
        await budgetsAPI.create(payload);
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menyimpan budget");
    }
  };

  const handleEdit = (budget) => {
    setForm({
      category_id: budget.category_id.toString(),
      amount: budget.amount.toString(),
      period: budget.period,
    });
    setEditingId(budget.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus budget ini?")) return;
    try {
      await budgetsAPI.delete(id);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus budget");
    }
  };

  const resetForm = () => {
    setForm({
      category_id: "",
      amount: "",
      period: "monthly",
    });
    setEditingId(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressClass = (percentage) => {
    if (percentage >= 100) return "danger";
    if (percentage >= 75) return "warning";
    return "safe";
  };

  // Get categories that don't have a budget yet
  const availableCategories = categories.filter(
    (c) => !budgets.some((b) => b.category_id === c.id) || editingId,
  );

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
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Budget Planning
          </h2>
          <p className="text-muted">Atur batas pengeluaran per kategori</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Tambah Budget
        </button>
      </div>

      {/* Budget List */}
      <div className="grid grid-cols-2">
        {budgets.map((budget) => (
          <div key={budget.id} className="card">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "var(--radius-lg)",
                    background: `${budget.category_color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                  }}
                >
                  {budget.category_icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{budget.category_name}</div>
                  <div
                    className="text-muted"
                    style={{ fontSize: "var(--font-size-sm)" }}
                  >
                    {budget.period === "monthly" ? "Bulanan" : "Mingguan"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleEdit(budget)}
                >
                  ✏️
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(budget.id)}
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="budget-progress">
              <div className="budget-progress-header">
                <span className="budget-progress-label">
                  {formatCurrency(budget.spent)} /{" "}
                  {formatCurrency(budget.amount)}
                </span>
                <span
                  className={`budget-progress-value ${budget.percentage >= 100 ? "text-danger" : ""}`}
                >
                  {budget.percentage}%
                </span>
              </div>
              <div className="budget-progress-bar">
                <div
                  className={`budget-progress-fill ${getProgressClass(budget.percentage)}`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <div>
                <div
                  className="text-muted"
                  style={{ fontSize: "var(--font-size-xs)" }}
                >
                  Terpakai
                </div>
                <div style={{ fontWeight: 600, color: "var(--danger-400)" }}>
                  {formatCurrency(budget.spent)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-muted"
                  style={{ fontSize: "var(--font-size-xs)" }}
                >
                  Sisa
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color:
                      budget.remaining >= 0
                        ? "var(--success-400)"
                        : "var(--danger-400)",
                  }}
                >
                  {formatCurrency(budget.remaining)}
                </div>
              </div>
            </div>

            {budget.percentage >= 100 && (
              <div
                className="alert alert-error mt-4"
                style={{ marginBottom: 0 }}
              >
                <span>⚠️</span>
                <span>Budget sudah melebihi batas!</span>
              </div>
            )}

            {budget.percentage >= 75 && budget.percentage < 100 && (
              <div
                className="alert"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "var(--warning-400)",
                  marginTop: "var(--spacing-4)",
                  marginBottom: 0,
                }}
              >
                <span>⚠️</span>
                <span>Budget hampir habis!</span>
              </div>
            )}
          </div>
        ))}

        {budgets.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-state-icon">🎯</div>
            <p className="empty-state-title">Belum ada budget</p>
            <p className="empty-state-description">
              Atur budget untuk mengontrol pengeluaranmu
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? "Edit Budget" : "Tambah Budget"}
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!editingId && (
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-select"
                      value={form.category_id}
                      onChange={(e) =>
                        setForm({ ...form, category_id: e.target.value })
                      }
                      required
                    >
                      <option value="">Pilih Kategori</option>
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Batas Budget (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Contoh: 1000000"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Periode</label>
                  <select
                    className="form-select"
                    value={form.period}
                    onChange={(e) =>
                      setForm({ ...form, period: e.target.value })
                    }
                  >
                    <option value="monthly">Bulanan</option>
                    <option value="weekly">Mingguan</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
