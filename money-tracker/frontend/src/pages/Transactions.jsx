import { useState, useEffect } from "react";
import { transactionsAPI, walletsAPI, categoriesAPI } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

const ProofModal = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        style={{ maxWidth: "600px", padding: "1rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Bukti Transaksi</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div
          className="modal-body"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <img
            src={src}
            alt="Proof"
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              borderRadius: "var(--radius-md)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default function Transactions() {
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [proofModalSrc, setProofModalSrc] = useState(null);

  const [filters, setFilters] = useState({
    type: "",
    wallet_id: "",
    category_id: "",
    start_date: "",
    end_date: "",
  });

  const [form, setForm] = useState({
    type: "expense",
    wallet_id: "",
    category_id: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    proof_image: "",
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [txRes, walletRes, catRes] = await Promise.all([
        transactionsAPI.getAll(filters),
        walletsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
      setTransactions(txRes.data);
      setWallets(walletRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large (max 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, proof_image: reader.result });
      };
      reader.readAsDataURL(file);
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
        await transactionsAPI.update(editingId, payload);
      } else {
        await transactionsAPI.create(payload);
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menyimpan transaksi");
    }
  };

  const handleEdit = (tx) => {
    setForm({
      type: tx.type,
      wallet_id: tx.wallet_id,
      category_id: tx.category_id,
      amount: tx.amount.toString(),
      description: tx.description || "",
      date: tx.date,
      proof_image: tx.proof_image || "",
    });
    setEditingId(tx.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("delete") + "?")) return;
    try {
      await transactionsAPI.delete(id);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus transaksi");
    }
  };

  const resetForm = () => {
    setForm({
      type: "expense",
      wallet_id: "",
      category_id: "",
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      proof_image: "",
    });
    setEditingId(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: language === "id" ? "IDR" : "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredCategories = categories.filter((c) => c.type === form.type);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-content-animated">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          {t("transactions")}
        </h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ {t("add_transaction")}
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">{t("type")}</label>
            <select
              className="form-select"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">Semua</option>
              <option value="income">{t("income")}</option>
              <option value="expense">{t("expense")}</option>
            </select>
          </div>
          <div>
            <label className="form-label">{t("wallets")}</label>
            <select
              className="form-select"
              value={filters.wallet_id}
              onChange={(e) =>
                setFilters({ ...filters, wallet_id: e.target.value })
              }
            >
              <option value="">Semua</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">{t("date")}</label>
            <input
              type="date"
              className="form-input"
              value={filters.start_date}
              onChange={(e) =>
                setFilters({ ...filters, start_date: e.target.value })
              }
            />
          </div>
          <div>
            <label className="form-label">-</label>
            <input
              type="date"
              className="form-input"
              value={filters.end_date}
              onChange={(e) =>
                setFilters({ ...filters, end_date: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card">
        {transactions.length > 0 ? (
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
                  <div className="transaction-category">{tx.category?.name}</div>
                  <div className="transaction-description">
                    {tx.description || "-"} • {tx.wallet?.name}
                  </div>
                </div>
                <div className="transaction-meta">
                  {tx.proof_image && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setProofModalSrc(tx.proof_image)}
                      title="View Proof"
                      style={{ padding: "0.2rem" }}
                    >
                      📎
                    </button>
                  )}
                  <div className={`transaction-amount ${tx.type}`}>
                    {tx.type === "income" ? "+" : "-"}{" "}
                    {formatCurrency(tx.amount)}
                  </div>
                  <div className="transaction-date">
                    {new Date(tx.date).toLocaleDateString(
                      language === "id" ? "id-ID" : "en-US",
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleEdit(tx)}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(tx.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">{t("no_transactions")}</p>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      <ProofModal src={proofModalSrc} onClose={() => setProofModalSrc(null)} />

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
                {editingId ? t("edit") : t("add_transaction")}
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
                {/* Type Toggle */}
                <div className="form-group">
                  <label className="form-label">{t("type")}</label>
                  <div
                    className="tabs"
                    style={{ borderBottom: "none", marginBottom: 0 }}
                  >
                    <button
                      type="button"
                      className={`tab ${form.type === "expense" ? "active" : ""}`}
                      onClick={() =>
                        setForm({ ...form, type: "expense", category_id: "" })
                      }
                    >
                      {t("expense")}
                    </button>
                    <button
                      type="button"
                      className={`tab ${form.type === "income" ? "active" : ""}`}
                      onClick={() =>
                        setForm({ ...form, type: "income", category_id: "" })
                      }
                    >
                      {t("income")}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("wallets")}</label>
                  <select
                    className="form-select"
                    value={form.wallet_id}
                    onChange={(e) =>
                      setForm({ ...form, wallet_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Wallet</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("category")}</label>
                  <select
                    className="form-select"
                    value={form.category_id}
                    onChange={(e) =>
                      setForm({ ...form, category_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Category</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("amount")}</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t("date")}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t("description")}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t("upload_proof")}</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {form.proof_image && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.8rem",
                        color: "var(--success-500)",
                      }}
                    >
                      ✅ Image selected (
                      {(form.proof_image.length / 1024).toFixed(0)} KB)
                    </div>
                  )}
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
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
