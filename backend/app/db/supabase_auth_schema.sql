-- ============================================================
-- Supabase: User / Profile tables (run in Supabase SQL Editor)
-- ============================================================
-- Your Argo schema (argo_metadata, file_info, etc.) stays as-is.
-- Supabase Auth already has auth.users. This adds a public profile
-- table that mirrors auth users and optional app-specific user data.
-- ============================================================

-- 1) Profiles table: one row per user (synced from auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS: users can read/update only their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3) Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Optional: table for user-specific app data (e.g. saved queries, favorites)
-- Uncomment if you need it:
/*
CREATE TABLE IF NOT EXISTS public.user_saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_saved_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved queries"
  ON public.user_saved_queries FOR ALL
  USING (auth.uid() = user_id);
*/

-- 5) Backfill existing auth users into profiles (run once after creating table)
-- INSERT INTO public.profiles (id, email, full_name, avatar_url)
-- SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
