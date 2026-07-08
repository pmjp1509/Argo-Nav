import { Trash2 } from 'lucide-react';

import { Conversation } from '@/components/assistant/Conversation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useAppStore } from '@/store/appStore';

export function AssistantPage() {
  const messages = useAppStore((s) => s.messages);
  const clear = useAppStore((s) => s.clearChat);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Logo className="size-7 rounded-md" />
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="size-4" /> Clear conversation
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1">
        <Conversation variant="page" />
      </div>
    </div>
  );
}
