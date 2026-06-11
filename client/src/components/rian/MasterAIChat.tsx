import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from './ui/Icons';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{ taskName: string; taskLink: string; taskGid: string }>;
}

interface Conversation {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
  created_at: string;
  updated_at: string;
}

interface Props {
  onClose: () => void;
}

export default function MasterAIChat({ onClose }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: `👋 Hi! I'm your **AI Executive Assistant** with deep knowledge of **Media.Rian** and **Media Squad** projects.

## What I can do:
• **Answer questions** - Workload, blockers, status, trends
• **Provide insights** - With clickable Asana task links as sources
• **Create tasks** - "Duplicate dubbing template task in Media Squad and call it 'Netflix Project'"
• **Add subtasks & comments** - Full Asana integration
• **Remember context** - Each conversation maintains full history

Try asking: "Show me blocked tasks" or "Create a task in Media Squad"`,
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch stats and conversations on mount
  useEffect(() => {
    fetchStats();
    fetchConversations();
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

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/master-ai/conversations`, {
        credentials: 'include',
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/master-ai/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      const data = await response.json();

      setCurrentConvId(data.conversation.id);
      setMessages([{
        id: '0',
        role: 'assistant',
        content: `👋 Starting a new conversation! Ask me anything about Media.Rian and Media Squad.`,
        timestamp: new Date(),
      }]);
      fetchConversations();
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/master-ai/conversations/${convId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      const conv = data.conversation;

      setCurrentConvId(convId);
      setMessages(conv.messages.map((m: any, idx: number) => ({
        id: idx.toString(),
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
        timestamp: new Date(),
      })));
      setShowConversations(false);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/master-ai/conversations/${convId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (currentConvId === convId) {
        setCurrentConvId(null);
        setMessages([{
          id: '0',
          role: 'assistant',
          content: `👋 Hi! I'm your AI Executive Assistant. Create a new conversation to get started.`,
          timestamp: new Date(),
        }]);
      }

      fetchConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
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
      // Create conversation if doesn't exist
      let convId = currentConvId;
      if (!convId) {
        const createResp = await fetch(`${API_URL}/api/master-ai/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: userMessage.content.slice(0, 50) }),
        });
        const createData = await createResp.json();
        convId = createData.conversation.id;
        setCurrentConvId(convId);
        fetchConversations();
      }

      const response = await fetch(`${API_URL}/api/master-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: userMessage.content,
          conversationId: convId,
        }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources,
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
    'Show me blocked initiatives',
    'Who has the most tasks?',
    'Create a task in Media Squad',
    'Latest activity this week',
    'Duplicate dubbing template task',
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
          maxWidth: 1000,
          height: '85vh',
          maxHeight: 700,
          background: 'var(--surface)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          zIndex: 2000,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar - Conversations */}
        <div
          style={{
            width: showConversations ? 260 : 0,
            borderRight: showConversations ? '1px solid var(--border)' : 'none',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={createNewConversation}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--rust)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r-md)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              <Icon name="add" size={16} />
              New Chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                style={{
                  padding: '10px 12px',
                  marginBottom: 4,
                  borderRadius: 'var(--r-md)',
                  cursor: 'pointer',
                  background: currentConvId === conv.id ? 'var(--surface)' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'var(--ink-3)',
                  }}
                  title="Delete conversation"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              <button
                onClick={() => setShowConversations(!showConversations)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: 'var(--r-md)',
                  color: '#fff',
                }}
                title="Toggle conversations"
              >
                <Icon name="menu" size={20} />
              </button>
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
                    {stats.totalTasks} tasks • {conversations.length} conversations
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
                    <div className="markdown-content">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rust)', textDecoration: 'underline' }} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--ink-3)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>📎 Sources:</div>
                      {msg.sources.map((src, i) => (
                        <div key={i}>• {src.taskName}</div>
                      ))}
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
                placeholder="Ask me anything or request task creation... (Enter to send)"
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
      </div>
    </>
  );
}
