import { useState, useRef, useEffect } from 'react';
import ResponseCharts, { type ChartData } from './ResponseCharts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sql?: string;
  refinedQuery?: string;
  dataPreview?: Record<string, unknown>;
  chartData?: Record<string, unknown> | null;
  floatIds?: string[];
}

interface ChatbotProps {
  isMaximized?: boolean;
  onMaximizeChange?: (isMaximized: boolean) => void;
  onHighlightFloats?: (floatIds: string[]) => void;
}

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const Chatbot = ({ isMaximized = false, onMaximizeChange, onHighlightFloats }: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I’m your Argo Float AI Assistant. Ask me anything about float data (e.g. temperature, salinity, location). I’ll correct your question if needed, run a query, and show you stats and charts.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    onHighlightFloats?.([]);

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input.trim() }),
      });

      if (!response.ok) throw new Error('Failed to get response from backend');

      const data = await response.json();
      const floatIds = Array.isArray(data.float_ids) ? data.float_ids : [];
      onHighlightFloats?.(floatIds);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.context || 'No explanation available.',
        timestamp: new Date(),
        sql: data.sql,
        refinedQuery: data.refined_query,
        dataPreview: data.data_preview,
        chartData: data.chart_data ?? null,
        floatIds,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        isMaximized
          ? 'fixed inset-0 z-[1000] bg-white flex flex-col overflow-hidden'
          : 'w-full h-full flex flex-col bg-slate-50 border-l border-slate-200'
      }
    >
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white flex-shrink-0">
        <h3 className="m-0 text-base font-semibold">Argo Float AI Assistant</h3>
        <button
          type="button"
          onClick={() => onMaximizeChange?.(!isMaximized)}
          className="bg-transparent border-none text-white cursor-pointer text-xl p-2 hover:bg-white/10 rounded transition-colors"
          aria-label={isMaximized ? 'Minimize' : 'Maximize'}
        >
          {isMaximized ? '✕' : '⛶'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] px-4 py-3 rounded-lg break-words whitespace-pre-wrap text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-900'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && msg.sql && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-600">SQL</summary>
                  <pre className="mt-1 text-xs overflow-auto bg-slate-100 p-2 rounded text-slate-800">
                    {msg.sql}
                  </pre>
                </details>
              )}
              {msg.role === 'assistant' && msg.refinedQuery && msg.refinedQuery !== msg.content && (
                <p className="mt-2 text-xs text-slate-500">Refined question: "{msg.refinedQuery}"</p>
              )}
              {msg.role === 'assistant' && msg.dataPreview && Object.keys(msg.dataPreview).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-600">Statistics</summary>
                  <pre className="mt-1 text-xs overflow-auto bg-slate-100 p-2 rounded text-slate-800">
                    {JSON.stringify(msg.dataPreview, null, 2)}
                  </pre>
                </details>
              )}
              {msg.role === 'assistant' && msg.chartData && (
                <ResponseCharts chartData={msg.chartData as ChartData} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 text-slate-500 italic text-sm">Loading...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-slate-200 flex gap-2 bg-white flex-shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Argo floats..."
          disabled={loading}
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white placeholder:text-slate-400 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
