import { useState, useEffect } from 'react';
import { Initiative } from '../../types/rian';
import { Icon } from './ui/Icons';
import { FLAG, PRIORITY_LABEL, fmtDate, avColor, initials } from '../../utils/rian';

const API_URL = import.meta.env.VITE_API_URL || '';

interface DrawerProps {
  initiativeId: string | null;
  onClose: () => void;
}

export default function Drawer({ initiativeId, onClose }: DrawerProps) {
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Fetch initiative details when drawer opens
  useEffect(() => {
    if (!initiativeId) {
      setInitiative(null);
      setAiSummary('');
      return;
    }

    setLoading(true);
    fetch(`${API_URL}/api/media-rian/initiatives/${initiativeId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setInitiative(data.initiative);
        setLoading(false);

        // Generate AI summary
        generateAISummary(data.initiative);
      })
      .catch(err => {
        console.error('Error fetching initiative:', err);
        setLoading(false);
      });
  }, [initiativeId]);

  const generateAISummary = async (init: Initiative) => {
    setLoadingAI(true);
    try {
      const response = await fetch(`${API_URL}/api/media-rian/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `Summarize this initiative: ${init.name}. Current status: ${init.overall}. Description: ${init.desc}`,
          initiatives: [init],
        }),
      });

      const data = await response.json();
      setAiSummary(data.data?.message || 'No summary available');
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setAiSummary('Unable to generate summary');
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !initiativeId || postingComment) return;

    setPostingComment(true);
    try {
      const response = await fetch(`${API_URL}/api/media-rian/initiatives/${initiativeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: newComment.trim() }),
      });

      if (!response.ok) throw new Error('Failed to post comment');

      const data = await response.json();

      // Add new comment to the list
      if (initiative) {
        setInitiative({
          ...initiative,
          comments: [...(initiative.comments || []), data.comment],
        });
      }

      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  if (!initiativeId) return null;

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
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
        }}
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50%',
          maxWidth: 800,
          background: 'var(--bg)',
          zIndex: 1000,
          overflowY: 'auto',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
            Loading initiative details...
          </div>
        ) : initiative ? (
          <div style={{ padding: '32px 40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: FLAG[initiative.overall].color,
                    }}
                  ></div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: FLAG[initiative.overall].color }}>
                    {FLAG[initiative.overall].label}
                  </span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 8 }}>
                  {initiative.name}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  {initiative.desc || 'No description provided'}
                </p>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  color: 'var(--ink-3)',
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* AI Summary */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon name="spark" size={16} style={{ color: 'var(--rust)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>AI Summary</h3>
              </div>
              {loadingAI ? (
                <p style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  Generating summary...
                </p>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  {aiSummary}
                </p>
              )}
            </div>

            {/* No additional details needed - all info visible in main table */}

            {/* Comments Chat Section */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 420px)',
                minHeight: 300,
              }}
            >
              {/* Chat Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="comment" size={16} style={{ color: 'var(--ink-2)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', margin: 0 }}>
                  Comments ({initiative.comments?.length || 0})
                </h3>
              </div>

              {/* Messages List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {!initiative.comments || initiative.comments.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink-3)',
                      fontSize: 14,
                    }}
                  >
                    No comments yet. Start the conversation!
                  </div>
                ) : (
                  initiative.comments.map((comment: any) => (
                    <div key={comment.gid} style={{ display: 'flex', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: avColor(comment.author),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {initials(comment.author)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
                            {comment.author}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{comment.ago}</span>
                        </div>
                        <p
                          style={{
                            fontSize: 14,
                            color: 'var(--ink-2)',
                            lineHeight: 1.5,
                            margin: 0,
                            wordWrap: 'break-word',
                          }}
                        >
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div
                style={{
                  padding: 16,
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
                    disabled={postingComment}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      maxHeight: 120,
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      fontSize: 14,
                      fontFamily: 'var(--sans)',
                      resize: 'vertical',
                      background: 'var(--surface)',
                      color: 'var(--ink-1)',
                    }}
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || postingComment}
                    style={{
                      padding: '10px 20px',
                      background: newComment.trim() ? 'var(--rust)' : 'var(--border)',
                      color: newComment.trim() ? '#fff' : 'var(--ink-3)',
                      border: 'none',
                      borderRadius: 'var(--r-md)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background 0.2s',
                    }}
                  >
                    {postingComment ? 'Posting...' : (
                      <>
                        <Icon name="send" size={14} />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
