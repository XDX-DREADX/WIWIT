// Admin Script - View and manage database (standalone)
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs"; // Need to install this if not available globally, or use dynamic import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data", "database.sqlite");
const wasmPath = path.join(
  __dirname,
  "node_modules",
  "sql.js",
  "dist",
  "sql-wasm.wasm",
);

async function main() {
  // Initialize SQL.js with local wasm file
  const SQL = await initSqlJs({
    locateFile: (file) => wasmPath,
  });

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log("❌ Database tidak ditemukan di:", dbPath);
    console.log("   Pastikan sudah ada user yang register terlebih dahulu.");
    process.exit(1);
  }

  // Load database
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const args = process.argv.slice(2);
  const command = args[0] || "help";

  console.log("\n🔑 Money Tracker Admin Console\n");
  console.log("=".repeat(50));

  const query = (sql) => {
    try {
      const stmt = db.prepare(sql);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (e) {
      return [];
    }
  };

  const queryOne = (sql) => {
    const results = query(sql);
    return results[0] || null;
  };

  switch (command) {
    case "users":
      console.log("\n📋 DAFTAR USERS:\n");
      const users = query("SELECT id, name, email, created_at FROM users");
      if (users.length === 0) {
        console.log("  (Belum ada user)");
      } else {
        users.forEach((u, i) => {
          console.log(`  ${i + 1}. ID: ${u.id}`);
          console.log(`     Nama: ${u.name}`);
          console.log(`     Email: ${u.email}`);
          console.log(`     Dibuat: ${u.created_at}`);
          console.log("");
        });
      }
      break;

    case "wallets":
      console.log("\n💰 DAFTAR WALLETS:\n");
      const wallets = query(`
        SELECT w.*, u.name as user_name 
        FROM wallets w 
        LEFT JOIN users u ON w.user_id = u.id
      `);
      if (wallets.length === 0) {
        console.log("  (Belum ada wallet)");
      } else {
        wallets.forEach((w, i) => {
          console.log(`  ${i + 1}. ${w.icon || "💰"} ${w.name} (${w.type})`);
          console.log(`     Saldo: Rp ${(w.balance || 0).toLocaleString()}`);
          console.log(`     Pemilik: ${w.user_name || "Unknown"}`);
          console.log("");
        });
      }
      break;

    case "transactions":
      console.log("\n💳 DAFTAR TRANSAKSI (10 Terakhir):\n");
      const transactions = query(`
        SELECT t.*, c.name as category_name, w.name as wallet_name, u.name as user_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN wallets w ON t.wallet_id = w.id
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.date DESC
        LIMIT 10
      `);
      if (transactions.length === 0) {
        console.log("  (Belum ada transaksi)");
      } else {
        transactions.forEach((t, i) => {
          const sign = t.type === "income" ? "+" : "-";
          console.log(
            `  ${i + 1}. ${t.type === "income" ? "📈" : "📉"} ${t.description}`,
          );
          console.log(`     ${sign}Rp ${(t.amount || 0).toLocaleString()}`);
          console.log(
            `     Kategori: ${t.category_name || "-"} | Wallet: ${t.wallet_name || "-"}`,
          );
          console.log(`     Tanggal: ${t.date} | User: ${t.user_name || "-"}`);
          console.log("");
        });
      }
      break;

    case "categories":
      console.log("\n📁 DAFTAR KATEGORI:\n");
      const categories = query(`
        SELECT c.*, u.name as user_name 
        FROM categories c 
        LEFT JOIN users u ON c.user_id = u.id
      `);
      if (categories.length === 0) {
        console.log("  (Belum ada kategori)");
      } else {
        categories.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.icon || "📁"} ${c.name} (${c.type})`);
          console.log(`     Pemilik: ${c.user_name || "Unknown"}`);
          console.log("");
        });
      }
      break;

    case "stats":
      console.log("\n📊 STATISTIK:\n");
      const userCount = queryOne("SELECT COUNT(*) as count FROM users");
      const walletCount = queryOne("SELECT COUNT(*) as count FROM wallets");
      const transactionCount = queryOne(
        "SELECT COUNT(*) as count FROM transactions",
      );
      const categoryCount = queryOne(
        "SELECT COUNT(*) as count FROM categories",
      );
      const budgetCount = queryOne("SELECT COUNT(*) as count FROM budgets");

      console.log(`  👥 Total Users: ${userCount?.count || 0}`);
      console.log(`  💰 Total Wallets: ${walletCount?.count || 0}`);
      console.log(`  💳 Total Transaksi: ${transactionCount?.count || 0}`);
      console.log(`  📁 Total Kategori: ${categoryCount?.count || 0}`);
      console.log(`  🎯 Total Budget: ${budgetCount?.count || 0}`);
      break;

    case "reset-password":
      const email = args[1];
      const newPassword = args[2] || "123456";

      if (!email) {
        console.log(
          "❌ Usage: node admin.js reset-password <email> [new_password]",
        );
        break;
      }

      const user = queryOne(`SELECT id FROM users WHERE email = '${email}'`);
      if (!user) {
        console.log(`❌ User dengan email '${email}' tidak ditemukan`);
        break;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run("UPDATE users SET password = ? WHERE id = ?", [
        hashedPassword,
        user.id,
      ]);

      // Save database back to file
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);

      console.log(
        `✅ Password untuk ${email} berhasil direset menjadi: ${newPassword}`,
      );
      break;

    default:
      console.log("📖 PERINTAH YANG TERSEDIA:\n");
      console.log("  node admin.js stats          - Lihat statistik");
      console.log("  node admin.js users          - Lihat semua users");
      console.log("  node admin.js wallets        - Lihat semua wallets");
      console.log(
        "  node admin.js transactions   - Lihat 10 transaksi terakhir",
      );
      console.log(
        "  node admin.js reset-password <email> [password] - Reset password user",
      );
      break;
  }

  console.log("\n" + "=".repeat(50) + "\n");
  try {
    db.close();
  } catch (e) {}
}

main().catch((err) => {
  console.error("Error:", err.message);
});
