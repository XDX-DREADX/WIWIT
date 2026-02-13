import { useState, useEffect, useRef } from "react";
import { dashboardAPI } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export default function FinancialAssistant() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Halo! Saya asisten keuangan Anda. Ada yang bisa saya bantu?",
      sender: "bot",
      type: "options",
      options: [
        { id: "predict", label: "Prediksi Pengeluaran" },
        { id: "saving", label: "Skema Hemat" },
        { id: "invest", label: "Skema Investasi" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("normal"); // normal, waiting_saving_target
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const addMessage = (text, sender = "bot", type = "text", options = []) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text, sender, type, options },
    ]);
  };

  const handleOptionClick = async (optionId) => {
    // Add user selection as message
    const optionLabel = messages[messages.length - 1].options.find(
      (o) => o.id === optionId,
    )?.label;
    addMessage(optionLabel || optionId, "user");

    setLoading(true);

    try {
      // Fetch data needed for analysis
      const res = await dashboardAPI.getSummary();
      const data = res.data;

      if (optionId === "predict") {
        // Logic: Avg last 3 months expenses + 5% inflation
        const monthlyTrend = data.monthlyTrend || [];
        let avgExpense = 0;
        if (monthlyTrend.length > 0) {
          const sum = monthlyTrend.reduce((acc, curr) => acc + curr.expense, 0);
          avgExpense = sum / monthlyTrend.length;
        } else {
          avgExpense = data.monthlyExpense;
        }

        const prediction = avgExpense * 1.05;
        const formatted = new Intl.NumberFormat(
          language === "id" ? "id-ID" : "en-US",
          {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          },
        ).format(prediction);

        setTimeout(() => {
          addMessage(
            `Berdasarkan tren pengeluaran Anda, prediksi pengeluaran bulan depan adalah sekitar **${formatted}**`,
          );
          setLoading(false);
        }, 1000);
      } else if (optionId === "saving") {
        setTimeout(() => {
          addMessage(
            "Berapa target tabungan yang ingin Anda capai bulan depan? (Masukkan angka, misal: 1000000)",
          );
          setMode("waiting_saving_target");
          setLoading(false);
        }, 800);
      } else if (optionId === "invest") {
        // 50/30/20 Rule
        const income = data.monthlyIncome || 0;
        if (income === 0) {
          setTimeout(() => {
            addMessage(
              "Saya belum memiliki data pemasukan Anda. Catat pemasukan terlebih dahulu!",
            );
            setLoading(false);
          }, 1000);
          return;
        }

        const needs = income * 0.5;
        const wants = income * 0.3;
        const savings = income * 0.2;

        const fmt = (val) =>
          new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(val);

        setTimeout(() => {
          addMessage(`
            Untuk skema investasi ideal (Aturan 50/30/20):
            
            💰 **Tabungan/Investasi (20%)**: ${fmt(savings)}
            🏠 **Kebutuhan (50%)**: ${fmt(needs)}
            🎁 **Keinginan (30%)**: ${fmt(wants)}
            
            Saya sarankan mulai dengan instrumen rendah risiko seperti Reksadana Pasar Uang.
            `);
          setLoading(false);
        }, 1500);
      }
    } catch (err) {
      addMessage("Maaf, saya gagal mengambil data keuangan Anda.");
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage(input, "user");
    const userText = input;
    setInput("");
    setLoading(true);

    if (mode === "waiting_saving_target") {
      // Parse amount
      const target = parseFloat(userText.replace(/[^0-9]/g, ""));
      if (isNaN(target)) {
        setTimeout(() => {
          addMessage("Mohon masukkan angka yang valid.");
          setLoading(false);
        }, 500);
        return;
      }

      try {
        const res = await dashboardAPI.getSummary();
        const data = res.data;
        const income = data.monthlyIncome || 0;
        const expense = data.monthlyExpense || 0;
        const currentSavings = income - expense;

        const fmt = (val) =>
          new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(val);

        let response = "";
        if (currentSavings >= target) {
          response = `Hebat! Arus kas Anda saat ini (surplus ${fmt(currentSavings)}) sudah cukup untuk mencapai target ${fmt(target)}. Pertahankan!`;
        } else {
          const deficit = target - currentSavings;
          // Suggest category cuts
          const categories = data.spendingByCategory || [];
          const topCategory = categories[0];

          response = `Untuk mencapai target ${fmt(target)}, Anda perlu menghemat sekitar **${fmt(deficit)}** lagi.\n\n`;
          if (topCategory) {
            response += `Saya sarankan kurangi pengeluaran di kategori **${topCategory.name}** yang saat ini mencapai ${fmt(topCategory.total)}.`;
          } else {
            response += "Coba kurangi pengeluaran yang tidak perlu.";
          }
        }

        setTimeout(() => {
          addMessage(response);
          setMode("normal");
          setLoading(false);
          // Offer menu again
          setTimeout(() => {
            addMessage("Ada lagi yang bisa saya bantu?", "bot", "options", [
              { id: "predict", label: "Prediksi Pengeluaran" },
              { id: "saving", label: "Skema Hemat" },
              { id: "invest", label: "Skema Investasi" },
            ]);
          }, 1000);
        }, 1000);
      } catch (err) {
        setLoading(false);
      }
    } else {
      // Default chat fallback
      setTimeout(() => {
        addMessage(
          "Maaf, saya hanya bot sederhana. Silakan pilih menu di atas.",
        );
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <div
      style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          boxShadow: "0 4px 20px rgba(99, 102, 241, 0.5)",
          display: isOpen ? "none" : "flex",
          fontSize: "1.5rem",
        }}
      >
        🤖
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="card"
          style={{
            width: "350px",
            height: "500px",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div
            className="card-header"
            style={{
              padding: "1rem",
              background: "var(--gradient-primary)",
              color: "white",
              marginBottom: 0,
              borderRadius: "0",
            }}
          >
            <div className="flex items-center gap-2">
              <span>🤖</span>
              <span style={{ fontWeight: 600 }}>Asisten Keuangan</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "1rem",
              overflowY: "auto",
              background: "var(--bg-secondary)",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.sender === "user" ? "flex-end" : "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "0.8rem",
                    borderRadius: "1rem",
                    background:
                      msg.sender === "user"
                        ? "var(--primary-600)"
                        : "var(--bg-tertiary)",
                    color:
                      msg.sender === "user" ? "white" : "var(--text-primary)",
                    borderBottomRightRadius:
                      msg.sender === "user" ? "0" : "1rem",
                    borderBottomLeftRadius: msg.sender === "bot" ? "0" : "1rem",
                    whiteSpace: "pre-line",
                    fontSize: "0.9rem",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Options */}
            {messages.length > 0 &&
              messages[messages.length - 1].type === "options" && (
                <div
                  className="flex flex-col gap-2 mt-2"
                  style={{ alignItems: "flex-start" }}
                >
                  {messages[messages.length - 1].options.map((opt) => (
                    <button
                      key={opt.id}
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOptionClick(opt.id)}
                      style={{ textAlign: "left" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div
                  className="loading-spinner"
                  style={{ width: "20px", height: "20px", borderWidth: "2px" }}
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "1rem",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              className="form-input"
              style={{ padding: "0.5rem" }}
              placeholder="Ketik pesan..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={mode === "normal"}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={mode === "normal" || !input.trim()}
            >
              ➤
            </button>
          </form>
          {mode === "normal" && (
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                padding: "0 1rem 0.5rem",
                textAlign: "center",
              }}
            >
              Pilih opsi di atas untuk memulai
            </div>
          )}
        </div>
      )}
    </div>
  );
}
