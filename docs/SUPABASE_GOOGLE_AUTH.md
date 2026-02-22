# Supabase Auth + Google Sign-In

## 1. Enable Google in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication** → **Providers** → enable **Google**.
3. You need a **Google OAuth Client**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**.
   - Create **OAuth 2.0 Client ID** (Application type: **Web application**).
   - Add **Authorized redirect URIs**:  
     `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`  
     (find your project ref in Supabase: Project Settings → API → Project URL.)
   - Copy **Client ID** and **Client Secret** into Supabase Google provider and save.

## 2. Run the SQL for user/profile table

- In Supabase: **SQL Editor** → New query.
- Paste and run the contents of `backend/app/db/supabase_auth_schema.sql`.
- This creates `public.profiles` and a trigger so every new sign-up (email or Google) gets a profile row.

## 3. Where user data lives

- **Auth users**: Supabase stores them in `auth.users` (managed by Supabase).
- **App user data**: Use `public.profiles` (and optional tables like `user_saved_queries`) in the **same** Supabase project where your Argo schema lives. No need for a separate DB; just add these tables alongside `argo_metadata`, etc.

## 4. Frontend: sign in with Google

Use the Supabase JS client:

```ts
import { supabase } from './lib/supabase';

// Google sign-in
await supabase.auth.signInWithOAuth({ provider: 'google' });
```

After redirect back, the session is in `supabase.auth.getSession()`. The app uses `AuthContext` and `AuthProvider` to expose `signInWithGoogle`, `signInWithEmail`, `signUpWithEmail`, and `signOut`.

## 5. Frontend environment variables

In `frontend/my-react-app` create a `.env` file (or `.env.local`):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Get both from Supabase: Project Settings → API → Project URL and anon public key.
