import { LogOut, Mail, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthPrompt } from '@/components/auth/AuthPrompt';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

function Field({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-medium">{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  if (!user) {
    return (
      <Page title="Account">
        <AuthPrompt title="Sign in to manage your account" onGuest={() => navigate('/')} />
      </Page>
    );
  }

  const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User';

  return (
    <Page title="Account" description="Your profile and plan.">
      <div className="grid gap-4 md:max-w-2xl">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="grid size-14 place-items-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-base font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={async () => { await signOut(); toast.info('Signed out.'); navigate('/'); }}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <Field icon={Mail} label="Email" value={user.email} />
            <Field icon={Shield} label="Member since" value={formatDate(user.created_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="primary">Free</Badge>
              <span className="text-sm text-muted-foreground">Limited daily AI usage</span>
            </div>
            <Button size="sm" onClick={() => toast.info('Payments are not enabled in this demo.')}>Upgrade to Pro</Button>
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Conversations are saved to your account. <Link to="/assistant" className="text-primary hover:underline">Open the assistant</Link>.
      </p>
    </Page>
  );
}
