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

            {/* Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
                marginBottom: 32,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                  INITIATIVE TYPE
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>{initiative.type}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                  PRIORITY
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>
                  {PRIORITY_LABEL[initiative.priority] || initiative.priority}
                </div>
              </div>

              {initiative.client && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                    CLIENT
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>{initiative.client}</div>
                </div>
              )}

              {initiative.region && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                    REGION
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>{initiative.region}</div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                  OWNER
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: avColor(initiative.owner),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                    }}
                  >
                    {initials(initiative.owner)}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--ink-1)' }}>{initiative.owner}</span>
                </div>
              </div>

              {initiative.due && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                    DUE DATE
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-1)' }}>{fmtDate(initiative.due)}</div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 16 }}>
                Comments ({initiative.comments?.length || 0})
              </h3>

              {!initiative.comments || initiative.comments.length === 0 ? (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--ink-3)',
                  }}
                >
                  No comments yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {initiative.comments.map((comment: any) => (
                    <div
                      key={comment.gid}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r-lg)',
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: avColor(comment.author),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#fff',
                          }}
                        >
                          {initials(comment.author)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
                          {comment.author}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{comment.ago}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
