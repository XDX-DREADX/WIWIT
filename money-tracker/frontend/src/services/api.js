import { supabase } from "../lib/supabase";

// Wallets API
export const walletsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { data };
  },
  getOne: async (id) => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return { data };
  },
  create: async (walletData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("wallets")
      .insert({ ...walletData, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, walletData) => {
    const { data, error } = await supabase
      .from("wallets")
      .update(walletData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) throw error;
    return { data: { success: true } };
  },
  transfer: async ({ from_wallet_id, to_wallet_id, amount }) => {
    // Get both wallets
    const { data: fromWallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", from_wallet_id)
      .single();
    const { data: toWallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", to_wallet_id)
      .single();

    // Update balances
    await supabase
      .from("wallets")
      .update({ balance: fromWallet.balance - amount })
      .eq("id", from_wallet_id);
    await supabase
      .from("wallets")
      .update({ balance: toWallet.balance + amount })
      .eq("id", to_wallet_id);

    return { data: { success: true } };
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async (type) => {
    let query = supabase.from("categories").select("*");
    if (type) {
      query = query.eq("type", type);
    }
    const { data, error } = await query.order("id", { ascending: true });
    if (error) throw error;
    return { data };
  },
  getOne: async (id) => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return { data };
  },
  create: async (categoryData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("categories")
      .insert({ ...categoryData, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, categoryData) => {
    const { data, error } = await supabase
      .from("categories")
      .update(categoryData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    return { data: { success: true } };
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async (params = {}) => {
    let query = supabase
      .from("transactions")
      .select(
        `
        *,
        wallet:wallets(id, name, icon, color),
        category:categories(id, name, icon, color)
      `,
      )
      .order("date", { ascending: false });

    if (params.type) {
      query = query.eq("type", params.type);
    }
    if (params.wallet_id) {
      query = query.eq("wallet_id", params.wallet_id);
    }
    if (params.category_id) {
      query = query.eq("category_id", params.category_id);
    }
    if (params.start_date) {
      query = query.gte("date", params.start_date);
    }
    if (params.end_date) {
      query = query.lte("date", params.end_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },
  getOne: async (id) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        wallet:wallets(id, name, icon, color),
        category:categories(id, name, icon, color)
      `,
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return { data };
  },
  create: async (transactionData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Insert transaction
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...transactionData, user_id: user.id })
      .select()
      .single();
    if (error) throw error;

    // Update wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", transactionData.wallet_id)
      .single();

    const newBalance =
      transactionData.type === "income"
        ? wallet.balance + transactionData.amount
        : wallet.balance - transactionData.amount;

    await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", transactionData.wallet_id);

    return { data };
  },
  update: async (id, transactionData) => {
    // Get old transaction
    const { data: oldTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    // Revert old balance
    const { data: oldWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", oldTx.wallet_id)
      .single();

    let revertedBalance =
      oldTx.type === "income"
        ? oldWallet.balance - oldTx.amount
        : oldWallet.balance + oldTx.amount;

    await supabase
      .from("wallets")
      .update({ balance: revertedBalance })
      .eq("id", oldTx.wallet_id);

    // Update transaction
    const { data, error } = await supabase
      .from("transactions")
      .update(transactionData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    // Apply new balance
    const walletId = transactionData.wallet_id || oldTx.wallet_id;
    const { data: newWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", walletId)
      .single();

    const amount = transactionData.amount || oldTx.amount;
    const type = transactionData.type || oldTx.type;
    const newBalance =
      type === "income"
        ? newWallet.balance + amount
        : newWallet.balance - amount;

    await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", walletId);

    return { data };
  },
  delete: async (id) => {
    // Get transaction before deleting
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    // Revert balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", tx.wallet_id)
      .single();

    const newBalance =
      tx.type === "income"
        ? wallet.balance - tx.amount
        : wallet.balance + tx.amount;

    await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", tx.wallet_id);

    // Delete transaction
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;

    return { data: { success: true } };
  },
};

// Budgets API
export const budgetsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("budgets")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .order("id", { ascending: true });
    if (error) throw error;

    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      data.map(async (budget) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount")
          .eq("category_id", budget.category_id)
          .eq("type", "expense")
          .gte("date", startOfMonth)
          .lte("date", endOfMonth);

        const spent =
          transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        return { ...budget, spent };
      }),
    );

    return { data: budgetsWithSpent };
  },
  getOne: async (id) => {
    const { data, error } = await supabase
      .from("budgets")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return { data };
  },
  create: async (budgetData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("budgets")
      .insert({ ...budgetData, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, budgetData) => {
    const { data, error } = await supabase
      .from("budgets")
      .update(budgetData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw error;
    return { data: { success: true } };
  },
};

// Dashboard API
export const dashboardAPI = {
  getSummary: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // Execute queries in parallel
    const [walletsRes, transactionsRes, budgetsRes] = await Promise.all([
      supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          `
          *,
          wallet:wallets(id, name, icon, color),
          category:categories(id, name, icon, color, type)
        `,
        )
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: false }),
      supabase.from("budgets").select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      ),
    ]);

    if (walletsRes.error) throw walletsRes.error;
    if (transactionsRes.error) throw transactionsRes.error;
    if (budgetsRes.error) throw budgetsRes.error;

    const wallets = walletsRes.data;
    const transactions = transactionsRes.data;
    const rawBudgets = budgetsRes.data;

    // Calculate totals
    const totalBalance =
      wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    const totalIncome =
      transactions
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalExpense =
      transactions
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Get recent transactions
    const recentTransactions = transactions?.slice(0, 5) || [];

    // Calculate budget spending using fetched transactions (Avoid N+1)
    const budgets = rawBudgets.map((budget) => {
      const budgetSpent = transactions
        .filter(
          (t) => t.category_id === budget.category_id && t.type === "expense",
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...budget, spent: budgetSpent };
    });

    // Group expenses by category
    const expensesByCategory = {};
    transactions
      ?.filter((t) => t.type === "expense")
      .forEach((t) => {
        const catId = t.category_id;
        if (catId && t.category) {
          if (!expensesByCategory[catId]) {
            expensesByCategory[catId] = {
              category: t.category,
              total: 0,
              id: catId,
              name: t.category.name,
              color: t.category.color,
            };
          }
          expensesByCategory[catId].total += Number(t.amount);
        }
      });

    return {
      data: {
        totalBalance,
        totalIncome,
        totalExpense,
        wallets,
        recentTransactions,
        budgets,
        expensesByCategory: Object.values(expensesByCategory).sort(
          (a, b) => b.total - a.total,
        ),
      },
    };
  },
};

// Reports API (for export)
export const reportsAPI = {
  exportPDF: async (params) => {
    // For client-side PDF generation, we'll return the data
    // and generate PDF in the component
    const { data } = await transactionsAPI.getAll(params);
    return { data };
  },
  exportExcel: async (params) => {
    const { data } = await transactionsAPI.getAll(params);
    return { data };
  },
};

// Profile API
export const profileAPI = {
  get: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return { data: { user: { ...user, ...data } } };
  },
  update: async (profileData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
};

// Keep default export for backward compatibility
export default {
  walletsAPI,
  categoriesAPI,
  transactionsAPI,
  budgetsAPI,
  dashboardAPI,
  reportsAPI,
  profileAPI,
};
