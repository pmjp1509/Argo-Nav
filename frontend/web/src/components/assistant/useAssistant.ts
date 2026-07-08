import { useCallback } from 'react';

import { useAsk } from '@/lib/api/hooks';
import { saveConversation } from '@/lib/conversations';
import { toFriendlyError } from '@/lib/errors';
import type { AgentResponse } from '@/lib/api/types';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Sends a query to /ask, appends messages, syncs highlight state, and (if the
 *  user is signed in) persists the exchange to conversation history. */
export function useSendMessage() {
  const ask = useAsk();
  const addMessage = useAppStore((s) => s.addMessage);
  const updateMessage = useAppStore((s) => s.updateMessage);
  const setLatest = useAppStore((s) => s.setLatest);
  const setHighlighted = useAppStore((s) => s.setHighlighted);
  const setChatOpen = useAppStore((s) => s.setChatOpen);

  return useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setChatOpen(true);
      addMessage({ id: uid(), role: 'user', content: q, ts: Date.now() });
      const aid = uid();
      addMessage({ id: aid, role: 'assistant', content: '', ts: Date.now(), loading: true });
      try {
        const res = await ask.mutateAsync(q);
        if (res.error_code) {
          const fe = toFriendlyError(res.error_code);
          updateMessage(aid, { loading: false, content: res.context, error: fe.message, errorKind: fe.kind });
          return;
        }
        updateMessage(aid, { loading: false, content: res.context, response: res });
        setLatest(res);
        if (res.float_ids?.length) setHighlighted(res.float_ids, true);

        const user = useAuthStore.getState().user;
        if (user) void saveConversation(user.id, q, res).catch(() => {});
      } catch (e) {
        const fe = toFriendlyError(e);
        updateMessage(aid, { loading: false, error: fe.message, errorKind: fe.kind });
      }
    },
    [ask, addMessage, updateMessage, setLatest, setHighlighted, setChatOpen],
  );
}

/** Re-open a stored conversation WITHOUT calling the LLM (no credits used). */
export function useRestoreConversation() {
  const addMessage = useAppStore((s) => s.addMessage);
  const setLatest = useAppStore((s) => s.setLatest);
  const setHighlighted = useAppStore((s) => s.setHighlighted);

  return useCallback(
    (prompt: string, response: AgentResponse) => {
      addMessage({ id: uid(), role: 'user', content: prompt, ts: Date.now() });
      addMessage({ id: uid(), role: 'assistant', content: response.context, response, ts: Date.now() });
      setLatest(response);
      if (response.float_ids?.length) setHighlighted(response.float_ids, true);
    },
    [addMessage, setLatest, setHighlighted],
  );
}
