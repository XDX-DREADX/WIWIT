import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.profile_photo || null);

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Ukuran file maksimal 5MB" });
        return;
      }

      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Update profile in database
      await updateProfile({ name, profile_photo: photoPreview });

      // Update email if changed
      if (email !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw new Error(error.message);
      }

      setMessage({ type: "success", text: "Profil berhasil diperbarui!" });
      setProfilePhoto(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Gagal memperbarui profil",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Password baru tidak sama" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password minimal 6 karakter" });
      return;
    }

    setPasswordLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw new Error(error.message);

      setMessage({ type: "success", text: "Password berhasil diubah!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Gagal mengubah password",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Profil</h2>
      </div>

      {message.text && (
        <div
          className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}
          style={{ marginBottom: "1.5rem", animation: "springIn 0.3s ease" }}
        >
          <span>{message.type === "success" ? "✓" : "⚠️"}</span>
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Profile Photo & Basic Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📷 Foto & Informasi Dasar</h3>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div
              style={{
                display: "flex",
                gap: "2rem",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              {/* Photo Upload */}
              <div className="profile-photo-section">
                <div
                  className="profile-photo-container"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      className="profile-photo"
                    />
                  ) : (
                    <div className="profile-photo-placeholder">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="profile-photo-overlay">
                    <span>📷</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  style={{ display: "none" }}
                />
                <p className="profile-photo-hint">Klik untuk upload foto</p>
              </div>

              {/* Info Form */}
              <div style={{ flex: 1, minWidth: "300px" }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔐 Ubah Password</h3>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={passwordLoading}
            >
              {passwordLoading ? "Mengubah..." : "Ubah Password"}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: "var(--danger-400)" }}>
              ⚠️ Zona Berbahaya
            </h3>
          </div>

          <div className="settings-section">
            <div className="settings-item" style={{ borderBottom: "none" }}>
              <div className="settings-item-info">
                <div className="settings-item-label">Keluar dari Akun</div>
                <div className="settings-item-description">
                  Anda akan keluar dari sesi saat ini
                </div>
              </div>
              <button className="btn btn-danger" onClick={logout}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-photo-section {
          text-align: center;
        }
        
        .profile-photo-container {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          margin: 0 auto 1rem;
          border: 3px solid var(--border-color);
          transition: all var(--transition-spring);
        }
        
        .profile-photo-container:hover {
          border-color: var(--primary-400);
          transform: scale(1.05);
        }
        
        .profile-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .profile-photo-placeholder {
          width: 100%;
          height: 100%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          font-weight: bold;
          color: white;
        }
        
        .profile-photo-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 2rem;
        }
        
        .profile-photo-container:hover .profile-photo-overlay {
          opacity: 1;
        }
        
        .profile-photo-hint {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        
        .settings-section {
          display: flex;
          flex-direction: column;
        }
        
        .settings-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
        }
        
        .settings-item-info {
          flex: 1;
        }
        
        .settings-item-label {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .settings-item-description {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
