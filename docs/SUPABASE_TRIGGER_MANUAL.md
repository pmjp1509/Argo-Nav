# Add the "new user → profile" trigger manually in Supabase

If the trigger didn’t run from the full schema, do these in **Supabase → SQL Editor** (one query at a time or all in one).

---

## Step 1: Create the function

Run this first:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
```

If you get "function already exists", that’s fine — it just updated it.

---

## Step 2: Create the trigger

Then run:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**If you get an error like "EXECUTE FUNCTION does not exist"** (older Postgres), use this instead:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
```

---

## Step 3: Confirm

- **Database → Triggers**: you should see `on_auth_user_created` on `auth.users`.
- **Database → Functions**: you should see `public.handle_new_user()`.

After this, every new sign-up (email or Google) will get a row in `public.profiles` automatically.

---

## If you already have users without profiles

Run once to backfill:

```sql
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```
