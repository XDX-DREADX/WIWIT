-- Money Tracker Database Setup (v2 - Fixed)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor)

-- 1. Create Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  profile_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('cash', 'bank', 'ewallet', 'investment')),
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Transactions Table
-- FIX: Added 'transfer' type and destination_wallet_id
-- FIX: Changed ON DELETE behavior for categories/wallets to prevent data loss
CREATE TABLE IF NOT EXISTS public.transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id INTEGER REFERENCES public.wallets(id) ON DELETE RESTRICT NOT NULL,
  destination_wallet_id INTEGER REFERENCES public.wallets(id) ON DELETE RESTRICT, -- For transfers
  category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  proof_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  period TEXT CHECK (period IN ('monthly', 'weekly')),
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Wallets
CREATE POLICY "Users can manage own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);


-- 8. AUTOMATION: User Creation Trigger
-- Automatically creates a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, profile_photo)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  
  -- Create default categories for new user
  INSERT INTO public.categories (user_id, name, type, icon, color) VALUES
  (new.id, 'Salary', 'income', '💰', '#10b981'),
  (new.id, 'Food', 'expense', '🍔', '#f43f5e'),
  (new.id, 'Transport', 'expense', '🚗', '#3b82f6'),
  (new.id, 'Utilities', 'expense', '💡', '#f59e0b');

  -- Create default wallet
  INSERT INTO public.wallets (user_id, name, type, balance, icon, color) VALUES
  (new.id, 'Cash', 'cash', 0, '💵', '#10b981');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 9. AUTOMATION: Wallet Balance Trigger
-- Automatically updates wallet balance when transactions are added/edited/deleted
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle DELETES and UPDATES (Subtract old values)
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.destination_wallet_id;
    END IF;
  END IF;

  -- Handle INSERTS and UPDATES (Add new values)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
      UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.destination_wallet_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transaction changes
DROP TRIGGER IF EXISTS on_transaction_change ON public.transactions;
CREATE TRIGGER on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

-- 10. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
