import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// Default categories for new users
const defaultCategories = [
  { name: "Gaji", type: "income", icon: "💼", color: "#22c55e" },
  { name: "Freelance", type: "income", icon: "💻", color: "#10b981" },
  { name: "Investasi", type: "income", icon: "📈", color: "#14b8a6" },
  { name: "Hadiah", type: "income", icon: "🎁", color: "#06b6d4" },
  { name: "Lainnya", type: "income", icon: "💵", color: "#0ea5e9" },
  { name: "Makanan", type: "expense", icon: "🍔", color: "#f43f5e" },
  { name: "Transportasi", type: "expense", icon: "🚗", color: "#ef4444" },
  { name: "Belanja", type: "expense", icon: "🛒", color: "#f97316" },
  { name: "Hiburan", type: "expense", icon: "🎮", color: "#f59e0b" },
  { name: "Tagihan", type: "expense", icon: "📄", color: "#eab308" },
  { name: "Kesehatan", type: "expense", icon: "💊", color: "#84cc16" },
  { name: "Pendidikan", type: "expense", icon: "📚", color: "#a855f7" },
  { name: "Lainnya", type: "expense", icon: "📦", color: "#ec4899" },
];

// Default wallets for new users
const defaultWallets = [
  { name: "Cash", type: "cash", icon: "💵", color: "#22c55e", balance: 0 },
  { name: "Bank BCA", type: "bank", icon: "🏦", color: "#3b82f6", balance: 0 },
  { name: "GoPay", type: "ewallet", icon: "📱", color: "#06b6d4", balance: 0 },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      console.warn("Auth check timed out, forcing load completion");
      if (mounted) setLoading(false);
    }, 3000);

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).finally(() => {
            if (mounted) setLoading(false);
            clearTimeout(safetyTimer);
          });
        } else {
          if (mounted) setLoading(false);
          clearTimeout(safetyTimer);
        }
      })
      .catch((err) => {
        console.error("Session check error:", err);
        if (mounted) setLoading(false);
        clearTimeout(safetyTimer);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        // Run profile fetch without blocking UI if it's an update
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }
      setProfile(data);
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultData = async (userId) => {
    // Insert default categories
    const categoriesWithUser = defaultCategories.map((cat) => ({
      ...cat,
      user_id: userId,
    }));
    await supabase.from("categories").insert(categoriesWithUser);

    // Insert default wallets
    const walletsWithUser = defaultWallets.map((wallet) => ({
      ...wallet,
      user_id: userId,
    }));
    await supabase.from("wallets").insert(walletsWithUser);
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.user;
  };

  const register = async (name, email, password) => {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      // Create profile
      await supabase.from("profiles").insert({
        id: data.user.id,
        name,
      });

      // Seed default data
      await seedDefaultData(data.user.id);
    }

    return data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    setProfile((prev) => ({ ...prev, ...updates }));
  };

  // Combine user and profile data for compatibility
  const combinedUser = user
    ? {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || "",
        profile_photo: profile?.profile_photo || null,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: combinedUser,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
