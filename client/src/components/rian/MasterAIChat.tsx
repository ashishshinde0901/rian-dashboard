import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from './ui/Icons';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any;
}

interface Props {
  onClose: () => void;
}

export default function MasterAIChat({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: `👋 Hi! I'm your AI assistant with deep knowledge of **Media.Rian** and **Media Squad** projects.

I can help you with:
• **Workload analysis** - Who's working on what?
• **Blocked tasks** - What's stuck and why?
• **Status updates** - Latest activity and progress
• **Team insights** - Trends, priorities, deadlines
• **Custom queries** - Ask me anything!

Try asking: "Who has the most tasks?" or "Show me blocked initiatives"`,
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/master-ai/stats`, {
        credentials: 'include',
      });
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const syncKnowledge = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_URL}/api/master-ai/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      setStats(data.stats);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Knowledge base synced! I now have deep insights on **${data.stats.totalTasks} tasks** across ${data.stats.projects.join(' and ')}.`,
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Failed to sync knowledge base');
    } finally {
      setSyncing(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/master-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: userMessage.content }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        chartData: data.chartData,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestionQueries = [
    'Who has the most tasks?',
    'Show me blocked initiatives',
    'What are the P0 priorities?',
    'Latest activity this week',
    'Media.Rian status summary',
  ];

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1999,
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      ></div>

      {/* Master AI Chat Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 900,
          height: '85vh',
          maxHeight: 700,
          background: 'var(--surface)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, var(--rust) 0%, var(--rust-deep) 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="spark" size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Master AI Assistant</h2>
              {stats && (
                <p style={{ fontSize: 12, margin: 0, opacity: 0.9 }}>
                  Knowledge: {stats.totalTasks} tasks • {stats.projects?.length || 0} projects • {stats.assignees?.length || 0} people
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={syncKnowledge}
              disabled={syncing}
              style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: 'var(--r-md)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="alert" size={14} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                color: '#fff',
              }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: 'var(--bg)',
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              style={{
                marginBottom: idx < messages.length - 1 ? 20 : 0,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: 'var(--r-lg)',
                  background: msg.role === 'user' ? 'var(--rust)' : 'var(--surface)',
                  color: msg.role === 'user' ? '#fff' : 'var(--ink-1)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  wordWrap: 'break-word',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                }}
              >
                {msg.role === 'assistant' ? (
                  <div
                    className="markdown-content"
                    style={{
                      '& p': { margin: '0 0 8px 0' },
                      '& p:last-child': { margin: 0 },
                      '& ul, & ol': { margin: '8px 0', paddingLeft: 20 },
                      '& li': { margin: '4px 0' },
                      '& strong': { fontWeight: 600 },
                      '& em': { fontStyle: 'italic' },
                      '& code': {
                        background: 'rgba(0, 0, 0, 0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        fontFamily: 'var(--mono)',
                      },
                      '& pre': {
                        background: 'rgba(0, 0, 0, 0.05)',
                        padding: 12,
                        borderRadius: 'var(--r-md)',
                        overflow: 'auto',
                        fontSize: '0.9em',
                      },
                      '& pre code': {
                        background: 'none',
                        padding: 0,
                      },
                      '& h1, & h2, & h3': {
                        margin: '12px 0 8px 0',
                        fontWeight: 600,
                      },
                    } as any}
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                )}
                {msg.chartData && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(0, 0, 0, 0.05)', borderRadius: 'var(--r-md)' }}>
                    <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(msg.chartData, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
              AI is thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ padding: '0 24px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {suggestionQueries.map(q => (
              <button
                key={q}
                onClick={() => setInput(q)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask me anything about your projects... (Enter to send)"
              disabled={loading}
              rows={2}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                fontSize: 14,
                fontFamily: 'var(--sans)',
                resize: 'none',
                background: 'var(--bg)',
                color: 'var(--ink-1)',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                padding: '0 24px',
                background: input.trim() ? 'var(--rust)' : 'var(--border)',
                color: input.trim() ? '#fff' : 'var(--ink-3)',
                border: 'none',
                borderRadius: 'var(--r-md)',
                fontSize: 14,
                fontWeight: 600,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="send" size={16} />
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
