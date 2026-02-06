import { useState, useEffect } from "react";
import { walletsAPI } from "../services/api";

const walletTypes = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "bank", label: "Bank", icon: "🏦" },
  { value: "ewallet", label: "E-Wallet", icon: "📱" },
];

const walletIcons = ["💵", "🏦", "💳", "📱", "💰", "🪙", "💎", "🏧"];
const walletColors = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#ef4444",
  "#6366f1",
];

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "cash",
    balance: "",
    icon: "💵",
    color: "#22c55e",
  });

  const [transferForm, setTransferForm] = useState({
    fromWalletId: "",
    toWalletId: "",
    amount: "",
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await walletsAPI.getAll();
      setWallets(res.data);
    } catch (err) {
      console.error("Error fetching wallets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        balance: parseFloat(form.balance) || 0,
      };

      if (editingId) {
        await walletsAPI.update(editingId, payload);
      } else {
        await walletsAPI.create(payload);
      }

      setShowModal(false);
      resetForm();
      fetchWallets();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menyimpan wallet");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await walletsAPI.transfer({
        fromWalletId: parseInt(transferForm.fromWalletId),
        toWalletId: parseInt(transferForm.toWalletId),
        amount: parseFloat(transferForm.amount),
      });
      setShowTransferModal(false);
      setTransferForm({ fromWalletId: "", toWalletId: "", amount: "" });
      fetchWallets();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal melakukan transfer");
    }
  };

  const handleEdit = (wallet) => {
    setForm({
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance.toString(),
      icon: wallet.icon,
      color: wallet.color,
    });
    setEditingId(wallet.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus wallet ini?")) return;
    try {
      await walletsAPI.delete(id);
      fetchWallets();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menghapus wallet");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "cash",
      balance: "",
      icon: "💵",
      color: "#22c55e",
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

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

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
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Wallet</h2>
          <p className="text-muted">Total: {formatCurrency(totalBalance)}</p>
        </div>
        <div className="flex gap-4">
          <button
            className="btn btn-secondary"
            onClick={() => setShowTransferModal(true)}
          >
            🔄 Transfer
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            ➕ Tambah Wallet
          </button>
        </div>
      </div>

      {/* Wallet Grid */}
      <div className="grid grid-cols-3">
        {wallets.map((wallet) => (
          <div key={wallet.id} className="wallet-card">
            <div className="wallet-card-header">
              <div
                className="wallet-card-icon"
                style={{ background: `${wallet.color}20` }}
              >
                {wallet.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="wallet-card-name">{wallet.name}</div>
                <div className="wallet-card-type">
                  {walletTypes.find((t) => t.value === wallet.type)?.label ||
                    wallet.type}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleEdit(wallet)}
                >
                  ✏️
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(wallet.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
            <div
              className="wallet-card-balance"
              style={{ color: wallet.color }}
            >
              {formatCurrency(wallet.balance)}
            </div>
          </div>
        ))}

        {wallets.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-state-icon">👛</div>
            <p className="empty-state-title">Belum ada wallet</p>
            <p className="empty-state-description">
              Tambahkan wallet pertamamu
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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
                {editingId ? "Edit Wallet" : "Tambah Wallet"}
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
                <div className="form-group">
                  <label className="form-label">Nama Wallet</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Bank BCA"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {walletTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Saldo Awal (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={form.balance}
                    onChange={(e) =>
                      setForm({ ...form, balance: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Icon</label>
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {walletIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`btn ${form.icon === icon ? "btn-primary" : "btn-secondary"}`}
                        style={{ width: 44, height: 44, fontSize: "1.25rem" }}
                        onClick={() => setForm({ ...form, icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warna</label>
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {walletColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--radius-lg)",
                          background: color,
                          border:
                            form.color === color ? "3px solid white" : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => setForm({ ...form, color })}
                      />
                    ))}
                  </div>
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

      {/* Transfer Modal */}
      {showTransferModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTransferModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Transfer Antar Wallet</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransferModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Dari Wallet</label>
                  <select
                    className="form-select"
                    value={transferForm.fromWalletId}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        fromWalletId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Wallet</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ke Wallet</label>
                  <select
                    className="form-select"
                    value={transferForm.toWalletId}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        toWalletId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Wallet</option>
                    {wallets
                      .filter(
                        (w) => w.id.toString() !== transferForm.fromWalletId,
                      )
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon} {w.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Jumlah (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={transferForm.amount}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        amount: e.target.value,
                      })
                    }
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTransferModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
