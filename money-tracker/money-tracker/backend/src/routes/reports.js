import express from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Export transactions to PDF
router.get("/export/pdf", async (req, res) => {
  try {
    const db = await getDB();
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    // Get transactions
    let query = `
      SELECT t.*, 
             w.name as wallet_name,
             c.name as category_name
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (start_date) {
      query += " AND t.date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND t.date <= ?";
      params.push(end_date);
    }

    query += " ORDER BY t.date DESC";

    const transactions = db.prepare(query).all(...params);

    // Calculate totals
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=financial-report-${new Date().toISOString().split("T")[0]}.pdf`,
    );

    doc.pipe(res);

    // Header
    doc.fontSize(24).text("Laporan Keuangan", { align: "center" });
    doc
      .fontSize(12)
      .text(`Money Tracker - ${req.user.name}`, { align: "center" });
    doc.moveDown();

    // Date range
    if (start_date || end_date) {
      doc
        .fontSize(10)
        .text(`Periode: ${start_date || "Awal"} - ${end_date || "Sekarang"}`, {
          align: "center",
        });
    }
    doc.moveDown();

    // Summary
    doc.fontSize(14).text("Ringkasan", { underline: true });
    doc.fontSize(12);
    doc.text(`Total Pemasukan: Rp ${totalIncome.toLocaleString("id-ID")}`);
    doc.text(`Total Pengeluaran: Rp ${totalExpense.toLocaleString("id-ID")}`);
    doc.text(
      `Selisih: Rp ${(totalIncome - totalExpense).toLocaleString("id-ID")}`,
    );
    doc.moveDown();

    // Transactions table
    doc.fontSize(14).text("Detail Transaksi", { underline: true });
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const tableLeft = 50;

    doc.fontSize(10);
    doc.text("Tanggal", tableLeft, tableTop);
    doc.text("Kategori", tableLeft + 80, tableTop);
    doc.text("Wallet", tableLeft + 180, tableTop);
    doc.text("Tipe", tableLeft + 280, tableTop);
    doc.text("Jumlah", tableLeft + 340, tableTop, {
      align: "right",
      width: 150,
    });

    doc
      .moveTo(tableLeft, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    let yPos = tableTop + 25;

    for (const tx of transactions.slice(0, 50)) {
      // Limit to 50 for PDF
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      doc.text(tx.date, tableLeft, yPos);
      doc.text(tx.category_name || "-", tableLeft + 80, yPos);
      doc.text(tx.wallet_name || "-", tableLeft + 180, yPos);
      doc.text(
        tx.type === "income" ? "Masuk" : "Keluar",
        tableLeft + 280,
        yPos,
      );
      doc.text(
        `Rp ${tx.amount.toLocaleString("id-ID")}`,
        tableLeft + 340,
        yPos,
        { align: "right", width: 150 },
      );

      yPos += 20;
    }

    // Footer
    doc
      .fontSize(8)
      .text(
        `Dibuat pada: ${new Date().toLocaleString("id-ID")}`,
        50,
        doc.page.height - 50,
        { align: "center" },
      );

    doc.end();
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

// Export transactions to Excel
router.get("/export/excel", async (req, res) => {
  try {
    const db = await getDB();
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    // Get transactions
    let query = `
      SELECT t.*, 
             w.name as wallet_name,
             c.name as category_name
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (start_date) {
      query += " AND t.date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND t.date <= ?";
      params.push(end_date);
    }

    query += " ORDER BY t.date DESC";

    const transactions = db.prepare(query).all(...params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Money Tracker";
    workbook.created = new Date();

    // Transactions sheet
    const sheet = workbook.addWorksheet("Transaksi");

    // Header style
    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6366F1" },
      },
      alignment: { horizontal: "center" },
    };

    // Add headers
    sheet.columns = [
      { header: "Tanggal", key: "date", width: 15 },
      { header: "Tipe", key: "type", width: 12 },
      { header: "Kategori", key: "category", width: 20 },
      { header: "Wallet", key: "wallet", width: 15 },
      { header: "Deskripsi", key: "description", width: 30 },
      { header: "Jumlah", key: "amount", width: 18 },
    ];

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Add data
    for (const tx of transactions) {
      sheet.addRow({
        date: tx.date,
        type: tx.type === "income" ? "Pemasukan" : "Pengeluaran",
        category: tx.category_name || "-",
        wallet: tx.wallet_name || "-",
        description: tx.description || "-",
        amount: tx.amount,
      });
    }

    // Format amount column as currency
    sheet.getColumn("amount").numFmt = '"Rp "#,##0';

    // Add summary at the bottom
    sheet.addRow([]);

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const summaryStartRow = sheet.rowCount + 1;
    sheet.addRow(["", "", "", "", "Total Pemasukan:", totalIncome]);
    sheet.addRow(["", "", "", "", "Total Pengeluaran:", totalExpense]);
    sheet.addRow(["", "", "", "", "Selisih:", totalIncome - totalExpense]);

    // Style summary
    for (let i = summaryStartRow; i <= sheet.rowCount; i++) {
      sheet.getRow(i).getCell(5).font = { bold: true };
      sheet.getRow(i).getCell(6).numFmt = '"Rp "#,##0';
    }

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=financial-report-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ error: "Failed to generate Excel report" });
  }
});

export default router;
