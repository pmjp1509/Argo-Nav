import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  isMaximized?: boolean;
  onMaximizeChange?: (isMaximized: boolean) => void;
}

const Chatbot = ({ isMaximized = false, onMaximizeChange }: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your Argo Float AI Assistant. Ask me any questions about the float data.',
      timestamp: new Date()
    }
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

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send query to backend pipeline
      const response = await fetch('http://127.0.0.1:8000/api/v1/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from backend');
      }

      const data = await response.json();

      // Format assistant response from pipeline
      const assistantContent = `
**SQL Generated:**
\`\`\`sql
${data.sql || 'N/A'}
\`\`\`

**Statistics:**
${JSON.stringify(data.stats || {}, null, 2)}

**Explanation:**
${data.explanation || 'No explanation available'}
      `.trim();

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = isMaximized
    ? {
        position: 'fixed' as const,
        top: 0,
        right: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        background: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const
      }
    : {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        background: '#f9fafb',
        borderLeft: '1px solid #e5e7eb'
      };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ padding: '1rem', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Argo Float AI Assistant</h3>
        <button
          onClick={() => onMaximizeChange?.(!isMaximized)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0.5rem'
          }}
        >
          {isMaximized ? '⛶' : '⛶'}
        </button>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '0.5rem'
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: msg.role === 'user' ? '#3b82f6' : '#e5e7eb',
                color: msg.role === 'user' ? 'white' : '#1f2937',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                fontSize: '0.9rem'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '0.75rem 1rem', color: '#6b7280', fontStyle: 'italic' }}>
              Loading...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '1rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '0.5rem',
          background: '#fff'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Argo floats..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.6 : 1,
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
