/**
 * Centralized error translation. The UI must NEVER show raw backend/provider
 * errors (stack traces, tool names, SQL, provider JSON). Everything funnels
 * through here into a stable kind + friendly message.
 */
export type ErrorKind = 'credits' | 'network' | 'unavailable' | 'unknown';

export interface FriendlyError {
  kind: ErrorKind;
  title: string;
  message: string;
}

const MESSAGES: Record<ErrorKind, { title: string; message: string }> = {
  credits: {
    title: 'Free AI limit reached',
    message: 'Your free AI credits have been exhausted. Upgrade to keep asking.',
  },
  network: {
    title: 'Connection problem',
    message: 'Unable to connect to the AI service. Please check your connection and try again.',
  },
  unavailable: {
    title: 'Service unavailable',
    message: 'The AI service is temporarily unavailable. Please try again shortly.',
  },
  unknown: {
    title: 'Something went wrong',
    message: 'Something went wrong. Please try again.',
  },
};

/** Classify a backend error_code, an HTTP/network error, or free text. */
export function toFriendlyError(input: unknown): FriendlyError {
  const kind = classifyKind(input);
  return { kind, ...MESSAGES[kind] };
}

function classifyKind(input: unknown): ErrorKind {
  // 1) explicit backend error_code
  if (typeof input === 'string' && ['credits', 'network', 'unavailable', 'unknown'].includes(input)) {
    return input as ErrorKind;
  }
  const raw = (input instanceof Error ? input.message : String(input ?? '')).toLowerCase();
  if (!raw) return 'unknown';
  if (/rate.?limit|tokens? per day|tpd|quota|exhaust|credit|billing|429|resource_exhausted/.test(raw)) return 'credits';
  if (/failed to fetch|networkerror|network error|timed out|timeout|econn|unreachable|load failed/.test(raw)) return 'network';
  if (/50\d|unavailable|temporarily|service/.test(raw)) return 'unavailable';
  return 'unknown';
}
