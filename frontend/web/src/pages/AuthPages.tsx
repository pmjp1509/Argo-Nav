import { ArrowLeft } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { toFriendlyError } from '@/lib/errors';
import { isAuthEnabled, useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="size-12 rounded-xl" />
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!isAuthEnabled && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
            Auth isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the frontend .env.
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">{children}</div>
        <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GoogleButton() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={async () => {
        try {
          await signInWithGoogle();
        } catch (err) {
          toast.error(toFriendlyError(err).message);
        }
      }}
    >
      <GoogleIcon /> Continue with Google
    </Button>
  );
}

function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3 text-[11px] uppercase text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(toFriendlyError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your AI research workspace"
      footer={<>No account? <Link to="/register" className="text-primary hover:underline">Create one</Link></>}
    >
      <GoogleButton />
      <OrDivider />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(email, password, name);
      toast.success('Account created. Check your email to confirm.');
      navigate('/');
    } catch (err) {
      toast.error(toFriendlyError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Start with free AI credits"
      footer={<>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}
    >
      <GoogleButton />
      <OrDivider />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('If that email exists, a reset link is on its way.');
    } catch (err) {
      toast.error(toFriendlyError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a reset link"
      footer={<Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline"><ArrowLeft className="size-3.5" /> Back to sign in</Link>}
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">Check your inbox for a password reset link.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
    </AuthShell>
  );
}
