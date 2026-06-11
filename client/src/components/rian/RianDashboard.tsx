import { useState, useEffect, useMemo } from 'react';
import { Initiative, InitiativeType, FlagColor } from '../../types/rian';
import { TABS, FLAG, avColor, initials, firstName, layoutFor, gridTemplateFor, fmtDate, DELIVERY_STATUS, COL_META } from '../../utils/rian';
import { Icon } from './ui/Icons';
import Drawer from './Drawer';
import MasterAIChat from './MasterAIChat';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function RianDashboard() {
  const [data, setData] = useState<Initiative[]>([]);
  const [tab, setTab] = useState<InitiativeType>(TABS[0].key);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statFilter, setStatFilter] = useState<'all' | FlagColor>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMasterAI, setShowMasterAI] = useState(false);
  const [showAllComments, setShowAllComments] = useState<Set<string>>(new Set());

  // Fetch initiatives on mount
  useEffect(() => {
    fetch(`${API_URL}/api/media-rian/initiatives`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch initiatives');
        return r.json();
      })
      .then(d => {
        setData(d.initiatives || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching initiatives:', err);
        setLoading(false);
      });
  }, []);

  // Derived data
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    TABS.forEach(t => {
      c[t.key] = data.filter(i => i.type === t.key).length;
    });
    return c;
  }, [data]);

  const blockedTotal = useMemo(() => data.filter(i => i.overall === 'red').length, [data]);

  const tabList = useMemo(() => data.filter(i => i.type === tab), [data, tab]);

  const visible = useMemo(() => {
    let list = tabList;
    if (statFilter !== 'all') list = list.filter(i => i.overall === statFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(i =>
        (i.name + ' ' + i.desc + ' ' + i.owner + ' ' + i.client).toLowerCase().includes(q)
      );
    }
    return list;
  }, [tabList, statFilter, query]);

  // Get column layout for current tab
  const layout = useMemo(() => layoutFor(tab), [tab]);
  const gridTemplate = useMemo(() => gridTemplateFor(layout), [layout]);

  // Handlers
  const switchTab = (k: InitiativeType) => {
    setTab(k);
    setSelectedId(null);
    setStatFilter('all');
    setQuery('');
  };

  const selectRow = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  };

  const toggleShowAllComments = (id: string) => {
    setShowAllComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="app">
        <div className="content">
          <div className="content-inner" style={{ paddingTop: 100, textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: 'var(--ink-2)' }}>Loading Media.Rian initiatives...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* NavBar */}
      <nav className="nav">
        <div className="brand">
          <div className="brand-mark">
            <i></i><i></i><i></i>
          </div>
          <div className="brand-name">RIAN <em>Ops</em></div>
        </div>
        <div className="brand-sep"></div>

        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab${tab === t.key ? ' active' : ''}`}
              onClick={() => switchTab(t.key)}
            >
              {t.short}
              <span className="tab-count">{counts[t.key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="nav-right">
          {/* Master AI Chat Button */}
          <button
            onClick={() => setShowMasterAI(true)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, var(--rust) 0%, var(--rust-deep) 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r-md)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(189, 74, 43, 0.3)',
            }}
            title="Open Master AI Assistant"
          >
            <Icon name="spark" size={16} />
            Master AI
          </button>

          {blockedTotal > 0 && (
            <button
              className="blocked-alert"
              onClick={() => setStatFilter('red')}
              title="Jump to blocked initiatives"
            >
              <span className="pulse"></span>
              <b>{blockedTotal}</b> blocked
            </button>
          )}

          <div className="conn demo">
            <span className="dot"></span>
            Demo · Real Data
          </div>

          <button className="avatar-btn" title="You">A</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-row">
        <div className="content">
          <div className="content-inner">
            <div className="page-head">
              <h1 className="page-title">Initiative <em>tracker</em></h1>
            </div>

            {/* Simple Table */}
            <div className="table-card">
              <div className="table-toolbar">
                <h2>Initiatives</h2>

                <div className="tfilter">
                  {(['red', 'amber', 'green'] as FlagColor[]).map(f => {
                    const count = tabList.filter(i => i.overall === f).length;
                    return (
                      <button
                        key={f}
                        className={`tchip${statFilter === f ? ' active' : ''}`}
                        onClick={() => setStatFilter(statFilter === f ? 'all' : f)}
                      >
                        <span className="d" style={{ background: FLAG[f].color }}></span>
                        <span className="ct">{count}</span>
                      </button>
                    );
                  })}

                  <div className="tfilter-sep"></div>

                  <button
                    className={`tchip all${statFilter === 'all' ? ' active' : ''}`}
                    onClick={() => setStatFilter('all')}
                  >
                    All <span className="ct">{tabList.length}</span>
                  </button>
                </div>

                <div className="search">
                  <Icon name="search" size={15} style={{ color: 'var(--ink-3)' }} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Filter initiatives…"
                  />
                </div>
              </div>

              {/* Column Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridTemplate,
                  columnGap: 8,
                  padding: '10px 0',
                  borderBottom: '2px solid var(--border)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <div></div> {/* Flag bar space */}
                {layout.map((col, idx) => (
                  <div
                    key={idx}
                    style={{
                      textAlign: COL_META[col].center ? 'center' : 'left',
                    }}
                  >
                    {COL_META[col].label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div>
                {visible.length === 0 ? (
                  <div className="empty">No initiatives match this view.</div>
                ) : (
                  visible.map(initiative => {
                    const deliveryInfo = DELIVERY_STATUS[initiative.deliveryStatus] || DELIVERY_STATUS['Not Started'];
                    const showAll = showAllComments.has(initiative.id);
                    const allComments = initiative.comments || [];
                    const commentsToShow = showAll ? allComments : allComments.slice(0, 3);

                    return (
                      <div key={initiative.id}>
                        {/* Main Row */}
                        <div
                          className={`row${selectedId === initiative.id ? ' sel' : ''}`}
                          onClick={() => selectRow(initiative.id)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: gridTemplate,
                            columnGap: 8,
                            padding: '10px 0',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            alignItems: 'start',
                          }}
                        >
                        {/* Flag bar */}
                        <div
                          className="flagbar"
                          style={{ background: FLAG[initiative.overall].color }}
                        ></div>

                        {/* Render columns based on layout */}
                        {layout.map((col, idx) => {
                          if (col === 'init') {
                            const asanaUrl = initiative.permalink_url || `https://app.asana.com/0/0/${initiative.asanaGid || initiative.gid}`;
                            return (
                              <div key={idx} style={{ minWidth: 0 }}>
                                <a
                                  href={asanaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="it-name"
                                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {initiative.name}
                                </a>
                                <div
                                  className="it-desc"
                                  style={{
                                    fontSize: 11,
                                    lineHeight: '1.4',
                                    maxHeight: '2.8em',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {initiative.desc}
                                </div>
                              </div>
                            );
                          }

                          if (col === 'conversion') {
                            return (
                              <div key={idx} className="l1" style={{ fontSize: 13 }}>
                                {initiative.conv || '—'}
                              </div>
                            );
                          }

                          if (col === 'delivery') {
                            return (
                              <div key={idx}>
                                <span
                                  className="badge"
                                  style={{
                                    background: deliveryInfo.bg,
                                    color: deliveryInfo.color,
                                    padding: '3px 8px',
                                    borderRadius: 'var(--r-sm)',
                                    fontSize: 12,
                                    fontWeight: 500,
                                  }}
                                >
                                  {initiative.deliveryStatus}
                                </span>
                              </div>
                            );
                          }

                          if (col === 'region') {
                            return (
                              <div key={idx} className="l1" style={{ fontSize: 13 }}>
                                {initiative.region || '—'}
                              </div>
                            );
                          }

                          if (col === 'client') {
                            return (
                              <div key={idx} className="l1" style={{ fontSize: 13 }}>
                                {initiative.client || '—'}
                              </div>
                            );
                          }

                          if (col === 'assignee') {
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                                <div
                                  className="asg-av"
                                  style={{ background: avColor(initiative.owner) }}
                                  title={initiative.owner}
                                >
                                  {initials(initiative.owner)}
                                </div>
                              </div>
                            );
                          }

                          if (col === 'committed') {
                            return (
                              <div key={idx} className="l1" style={{ fontSize: 13 }}>
                                {fmtDate(initiative.due)}
                              </div>
                            );
                          }

                          if (col === 'deadline') {
                            return (
                              <div key={idx} className="l1" style={{ fontSize: 13 }}>
                                {fmtDate(initiative.due)}
                              </div>
                            );
                          }

                          if (col === 'prio') {
                            return (
                              <div key={idx} style={{ textAlign: 'center' }}>
                                <span className={`prio ${initiative.priority}`}>{initiative.priority}</span>
                              </div>
                            );
                          }

                          if (col === 'aiSummary') {
                            return (
                              <div key={idx} style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    lineHeight: '1.4',
                                    color: 'var(--ink-2)',
                                    maxHeight: '4.2em',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {initiative.desc || 'No summary available'}
                                </div>
                              </div>
                            );
                          }

                          if (col === 'commentsList') {
                            const hasComments = initiative.comments && initiative.comments.length > 0;
                            console.log(`Task ${initiative.name}:`, {
                              hasComments,
                              commentsLength: initiative.comments?.length,
                              comments: initiative.comments
                            });
                            return (
                              <div key={idx} style={{ minWidth: 0 }}>
                                {!hasComments ? (
                                  <div>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: 4 }}>
                                      No comments
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert('Comment input coming soon!');
                                      }}
                                      style={{
                                        padding: '2px 8px',
                                        background: 'var(--rust)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 'var(--r-sm)',
                                        fontSize: 9,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      + Add comment
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    {commentsToShow.map((comment, cidx) => (
                                      <div
                                        key={cidx}
                                        style={{
                                          padding: '3px 0',
                                          borderBottom: cidx < commentsToShow.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                          <div
                                            style={{
                                              width: 14,
                                              height: 14,
                                              borderRadius: '50%',
                                              background: avColor(comment.author),
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: 7,
                                              fontWeight: 600,
                                              color: '#fff',
                                            }}
                                          >
                                            {initials(comment.author)}
                                          </div>
                                          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-1)' }}>
                                            {firstName(comment.author)}
                                          </span>
                                          <span style={{ fontSize: 8, color: 'var(--ink-3)' }}>
                                            {comment.ago}
                                          </span>
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 9,
                                            color: 'var(--ink-2)',
                                            lineHeight: '1.3',
                                            maxHeight: '2.6em',
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                          }}
                                        >
                                          {comment.text}
                                        </div>
                                      </div>
                                    ))}
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                      {allComments.length > 3 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleShowAllComments(initiative.id);
                                          }}
                                          style={{
                                            padding: '2px 6px',
                                            background: 'none',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--r-sm)',
                                            fontSize: 8,
                                            color: 'var(--ink-2)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {showAll ? 'Show less' : `+${allComments.length - 3} more`}
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          alert('Comment input coming soon!');
                                        }}
                                        style={{
                                          padding: '2px 6px',
                                          background: 'var(--rust)',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: 'var(--r-sm)',
                                          fontSize: 8,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        + Add
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return null;
                        })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer initiativeId={selectedId} onClose={() => setSelectedId(null)} />

      {/* Master AI Chat */}
      {showMasterAI && <MasterAIChat onClose={() => setShowMasterAI(false)} />}
    </div>
  );
}
