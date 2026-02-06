import { useState, useEffect } from "react";
import { categoriesAPI } from "../services/api";

const categoryIcons = [
  "🍔",
  "🚗",
  "🛒",
  "🎮",
  "📄",
  "💊",
  "📚",
  "💼",
  "💻",
  "📈",
  "🎁",
  "💵",
  "📦",
  "✈️",
  "🏠",
  "👕",
];
const categoryColors = [
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("expense");

  const [form, setForm] = useState({
    name: "",
    type: "expense",
    icon: "📁",
    color: "#6366f1",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await categoriesAPI.update(editingId, form);
      } else {
        await categoriesAPI.create(form);
      }

      setShowModal(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menyimpan kategori");
    }
  };

  const handleEdit = (category) => {
    setForm({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
    });
    setEditingId(category.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus kategori ini?")) return;
    try {
      await categoriesAPI.delete(id);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menghapus kategori");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "expense",
      icon: "📁",
      color: "#6366f1",
    });
    setEditingId(null);
  };

  const openAddModal = (type) => {
    setForm({ ...form, type });
    setShowModal(true);
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

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
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Kategori</h2>
        <button
          className="btn btn-primary"
          onClick={() => openAddModal(activeTab)}
        >
          ➕ Tambah Kategori
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === "expense" ? "active" : ""}`}
          onClick={() => setActiveTab("expense")}
        >
          Pengeluaran ({categories.filter((c) => c.type === "expense").length})
        </button>
        <button
          className={`tab ${activeTab === "income" ? "active" : ""}`}
          onClick={() => setActiveTab("income")}
        >
          Pemasukan ({categories.filter((c) => c.type === "income").length})
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-4">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="card"
            style={{ position: "relative" }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--radius-xl)",
                  background: `${category.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                }}
              >
                {category.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{category.name}</div>
                <div
                  className="badge"
                  style={{
                    background: `${category.color}20`,
                    color: category.color,
                  }}
                >
                  {category.type === "income" ? "Pemasukan" : "Pengeluaran"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleEdit(category)}
                >
                  ✏️
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(category.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-title">
              Belum ada kategori{" "}
              {activeTab === "income" ? "pemasukan" : "pengeluaran"}
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
                {editingId ? "Edit Kategori" : "Tambah Kategori"}
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
                  <label className="form-label">Nama Kategori</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Makanan"
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
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Icon</label>
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {categoryIcons.map((icon) => (
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
                    {categoryColors.map((color) => (
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
    </div>
  );
}
