# Architecture: Auth, Supabase & Deployment

## Is it OK to use Supabase in the frontend?

**Yes.** Supabase is designed for this. You use the **anon (public) key** in the browser; Row Level Security (RLS) and Auth policies limit what users can do. This is the standard approach and does not cause deployment issues.

## Is it OK to do auth in the frontend?

**Yes.** Supabase Auth is meant to be used from the client: sign in, session, tokens. Your React app handles login/signup with Supabase; no need to move auth to the backend unless you have a specific reason (e.g. custom server-only flows).

## Can we containerize backend and frontend separately?

**Yes.** Typical layout:

```
[Browser]
    │
    ├──► Supabase (Auth, DB)     ← frontend uses anon key (VITE_SUPABASE_*)
    │
    └──► Your Backend (FastAPI)  ← frontend calls API (e.g. /api/v1/ask, /floats)
```

- **Backend container:** FastAPI + env (DATABASE_URL, GROQ_API_KEY, etc.). Serves `/api/v1/*`.
- **Frontend container:** Build Vite app with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (build-time or runtime), serve static files (e.g. nginx or Node).

Frontend and backend can run in separate containers; frontend talks to Supabase for auth and to your backend for app API. Set CORS on the backend to allow the frontend origin.

## When to involve the backend in auth

Only if you need **protected API routes** (e.g. “only logged-in users can call /api/v1/ask”):

1. Frontend sends the Supabase **access_token** in the request (e.g. `Authorization: Bearer <token>`).
2. Backend verifies the JWT with Supabase (JWT secret or Supabase API) and reads the user id.
3. Auth remains in the frontend; backend only verifies.

If you don’t need protected routes, your current setup (auth only in frontend, backend open) is fine and deployable.

## Summary

| Question | Answer |
|----------|--------|
| Supabase in frontend? | Yes, standard and fine for deployment. |
| Auth in frontend? | Yes, Supabase Auth is client-first. |
| Backend + frontend in separate containers? | Yes, both can run separately; frontend calls Supabase and your API. |
