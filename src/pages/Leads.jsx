// ─────────────────────────────────────────────────────────────────────────
// Leads — CRM module.
// Four views (Pipeline / Table / AI Focus / Demand), AI scoring centerpiece,
// Build-vs-Subscribe demand signal. Telegram-only contact (no email).
// Matches the warm cream/salmon theme; light + dark via CSS variables.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus, RefreshCw, Loader2, Search, Target, Table2, Zap, BarChart3,
  Sparkles, ArrowUpRight, ChevronRight, Clock, AlertTriangle, TrendingUp,
} from 'lucide-react';
import {
  leadService, STAGES, STAGE_LABELS, tierTone, followMeta, isOpen,
  fmtMoneyK, fmtMoneyFull, initials,
} from '../lib/services/leadService';
import { userService } from '../lib/services/userService';
import { useSystem } from '../components/SystemUI';
import LeadCard from '../components/leads/LeadCard';
import ScoreRing from '../components/leads/ScoreRing';
import InterestBadge from '../components/leads/InterestBadge';
import LeadModal from '../components/leads/LeadModal';
import AddLeadModal from '../components/leads/AddLeadModal';
import EditLeadModal from '../components/leads/EditLeadModal';
import DemandView from '../components/leads/DemandView';

const BOARD_STAGES = ['new', 'contacted', 'inprocess', 'proposal', 'won'];
const STAGE_DOT = {
  new: 'var(--text-tertiary)', contacted: 'var(--accent-warning-text)',
  inprocess: 'var(--accent-primary)', proposal: 'var(--accent-primary-text)',
  won: 'var(--accent-success-text)', lost: 'var(--alert-error-text)',
};

const VIEWS = [
  { id: 'pipeline', label: 'Pipeline', icon: <Target size={14} /> },
  { id: 'table',    label: 'Table',    icon: <Table2 size={14} /> },
  { id: 'focus',    label: 'AI Focus', icon: <Zap size={14} /> },
  { id: 'demand',   label: 'Demand',   icon: <BarChart3 size={14} /> },
];

// urgency rank for the AI Focus queue: overdue/today first, then score
const urgencyRank = (l) => {
  const fm = followMeta(l.followUp);
  if (fm.overdue) return 3;
  if (fm.due) return 2;
  return l.followUp ? 1 : 0;
};

export default function Leads({ currentUser }) {
  const { toast } = useSystem();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('pipeline');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, us] = await Promise.all([
        leadService.listLeads(),
        userService.getAllProfiles().catch(() => []),
      ]);
      setLeads(rows);
      setUsers(us || []);
    } catch (err) {
      console.error('Leads fetch error:', err);
      toast.error('Failed to load leads.');
    } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ownerName = useCallback((id) => {
    if (!id) return 'Unassigned';
    const u = users.find(u => u.id === id);
    return u ? u.name : 'Unassigned';
  }, [users]);

  const stats = useMemo(() => leadService.computeStats(leads), [leads]);

  const filtered = useMemo(() => {
    let list = leads;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(l =>
        (l.company || '').toLowerCase().includes(q) ||
        (l.contact || '').toLowerCase().includes(q) ||
        (l.field || '').toLowerCase().includes(q) ||
        (l.telegram || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, search]);

  // keep the modal's lead in sync with state
  const selectedLive = useMemo(
    () => (selected ? leads.find(l => l.id === selected.id) || selected : null),
    [selected, leads]
  );

  // ── mutations ──
  const applyUpdate = (updated) => setLeads(ls => ls.map(l => l.id === updated.id ? updated : l));

  const onStage = async (id, stage) => {
    const prev = leads.find(l => l.id === id);
    applyUpdate({ ...prev, stage }); // optimistic
    try {
      const updated = await leadService.setStage(id, stage);
      applyUpdate(updated);
      toast.success(`Moved to ${STAGE_LABELS[stage]}.`);
    } catch { applyUpdate(prev); toast.error('Failed to move lead.'); }
  };

  const onIntent = async (id, intent) => {
    const prev = leads.find(l => l.id === id);
    const next = prev.intent === intent ? null : intent; // toggle off if same
    applyUpdate({ ...prev, intent: next });
    try {
      const updated = await leadService.setIntent(id, next);
      applyUpdate(updated);
      toast.success(next ? `Marked: ${next === 'subscribe' ? 'Subscribe' : 'Custom build'}.` : 'Interest cleared.');
    } catch { applyUpdate(prev); toast.error('Failed to mark interest.'); }
  };

  const toggleInterestQuick = async (lead) => {
    // cycle: null -> subscribe -> build -> null
    const next = lead.intent === 'subscribe' ? 'build' : lead.intent === 'build' ? null : 'subscribe';
    const prev = lead;
    applyUpdate({ ...lead, intent: next });
    try { applyUpdate(await leadService.setIntent(lead.id, next)); }
    catch { applyUpdate(prev); toast.error('Failed to mark interest.'); }
  };

  const onConvert = async (lead) => {
    try {
      const { lead: updated } = await leadService.convertToProject(lead, currentUser);
      applyUpdate(updated);
      toast.success(`Converted ${lead.company} to a project.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert: ' + (err.message || 'error'));
    }
  };

  const onLog = async (leadId, body) => {
    try {
      const created = await leadService.logActivity(leadId, body, currentUser?.id || null);
      toast.success('Activity logged.');
      return created;
    } catch { toast.error('Failed to log activity.'); return null; }
  };

  const onReScoreAll = async () => {
    if (rescoring) return;
    setRescoring(true);
    try {
      const updates = leads.map(l => ({ ...l, score: leadService.scoreLead(l) }));
      setLeads(updates); // optimistic
      await Promise.all(
        updates
          .filter((u, i) => u.score !== leads[i].score)
          .map(u => leadService.updateLead(u.id, { score: u.score }))
      );
      toast.success('Re-scored all leads.');
    } catch { toast.error('Re-score failed.'); fetchAll(); }
    finally { setRescoring(false); }
  };

  const onCreated = (lead) => {
    setLeads(ls => [lead, ...ls]);
    setShowAdd(false);
    toast.success(`Added ${lead.company}.`);
  };

  const onSaved = (updated) => {
    applyUpdate(updated);
    setEditLead(null);
    toast.success('Lead updated.');
  };

  // AI reads the lead's notes/activity and updates stage, interest, score, next step.
  const onAIUpdate = async (lead, activities = []) => {
    try {
      const a = await leadService.analyzeLead(lead, activities);
      const updated = await leadService.updateLead(lead.id, {
        stage: a.stage, intent: a.intent, score: a.score,
        signals: a.signals, summary: a.summary, nextStep: a.nextStep,
      });
      applyUpdate(updated);
      const changes = [];
      if (a.stage !== lead.stage) changes.push(`stage → ${STAGE_LABELS[a.stage]}`);
      if (a.intent !== lead.intent) changes.push(`interest → ${a.intent || 'unmarked'}`);
      if (a.score !== lead.score) changes.push(`score → ${a.score}`);
      const summary = changes.length ? changes.join(', ') : 'no status change';
      await leadService.logActivity(lead.id, `AI analysed the notes — ${summary}.`, currentUser?.id || null);
      toast.success(`AI updated ${lead.company} (${summary}).`);
    } catch (err) {
      console.error(err);
      toast.error('AI update failed: ' + (err.message || 'error'));
    }
  };

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const lead = leads.find(l => l.id === draggableId);
    if (!lead || lead.stage === destination.droppableId) return;
    onStage(draggableId, destination.droppableId);
  };

  // due-today names for the AI banner
  const dueLeads = useMemo(
    () => filtered.filter(l => isOpen(l) && followMeta(l.followUp).due)
      .sort((a, b) => b.score - a.score),
    [filtered]
  );

  return (
    <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>Leads</h2>
          <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {stats.openCount} open lead{stats.openCount === 1 ? '' : 's'} · {fmtMoneyFull(stats.pipelineValue)} in pipeline
            {' · '}<span style={{ color: 'var(--accent-primary-text)', fontWeight: 600 }}>{stats.dueToday} due today</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onReScoreAll} disabled={rescoring} className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {rescoring ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Re-score all
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} />Add lead
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 12 }} className="responsive-kpis">
        <KpiHero label="Open pipeline value" value={fmtMoneyFull(stats.pipelineValue)} leads={leads} />
        <Kpi tone="accent" label="Hot leads" value={stats.hot} sub="scoring ≥ 80" />
        <Kpi tone="warning" label="Due today" value={stats.dueToday} sub="follow-ups" />
        <Kpi tone="neutral" label="Subscription demand" value={stats.subscribeCount}
          sub={`across ${stats.subFieldCount} field${stats.subFieldCount === 1 ? '' : 's'}`}
          onClick={() => setView('demand')} />
        <Kpi tone="success" label="Won this month" value={fmtMoneyK(stats.wonValue)}
          sub={`${stats.wonCount} deal${stats.wonCount === 1 ? '' : 's'} · ${stats.winRate}% win`} />
      </div>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 34,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
        }}>
          <Search size={13} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, contact, field…"
            style={{ width: 230, maxWidth: '50vw', height: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13 }} />
        </div>

        <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 600,
              background: view === v.id ? 'var(--bg-primary)' : 'transparent',
              color: view === v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none',
            }}>{v.icon}{v.label}</button>
          ))}
        </div>
      </div>

      {/* AI INSIGHTS BANNER (Pipeline & Table) */}
      {(view === 'pipeline' || view === 'table') && dueLeads.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)',
          borderRadius: 'var(--radius-lg)', flexWrap: 'wrap',
        }}>
          <Sparkles size={16} style={{ color: 'var(--accent-primary-text)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 200 }}>
            <strong>{dueLeads.length} follow-up{dueLeads.length === 1 ? '' : 's'} due today</strong> — ranked by AI score:{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{dueLeads.slice(0, 3).map(l => l.company).join(', ')}</span>
          </span>
          <button onClick={() => setView('focus')} className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} />Work the queue
          </button>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : view === 'pipeline' ? (
        <PipelineBoard leads={filtered} onDragEnd={onDragEnd}
          onOpen={setSelected} onToggleInterest={toggleInterestQuick} />
      ) : view === 'table' ? (
        <LeadTable leads={filtered} stageFilter={stageFilter} setStageFilter={setStageFilter}
          ownerName={ownerName} onOpen={setSelected} />
      ) : view === 'focus' ? (
        <AIFocus leads={filtered} onOpen={setSelected} />
      ) : (
        <DemandView leads={leads} stats={stats} />
      )}

      {/* MODALS */}
      {selectedLive && (
        <LeadModal lead={selectedLive} ownerName={ownerName(selectedLive.owner)}
          onClose={() => setSelected(null)}
          onStage={onStage} onIntent={onIntent} onConvert={onConvert} onLog={onLog}
          onEdit={setEditLead} onAIUpdate={onAIUpdate} />
      )}
      {editLead && (
        <EditLeadModal lead={editLead} users={users} onClose={() => setEditLead(null)} onSaved={onSaved} />
      )}
      {showAdd && (
        <AddLeadModal currentUser={currentUser} onClose={() => setShowAdd(false)} onCreated={onCreated} />
      )}
    </div>
  );
}

// ── Pipeline board ──────────────────────────────────────────────────────────
function PipelineBoard({ leads, onDragEnd, onOpen, onToggleInterest }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_STAGES.length}, minmax(220px, 1fr))`, gap: 12, overflowX: 'auto' }} className="leads-board">
        {BOARD_STAGES.map(stage => {
          const colLeads = leads.filter(l => l.stage === stage).sort((a, b) => b.score - a.score);
          return (
            <Droppable droppableId={stage} key={stage}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  style={{
                    display: 'flex', flexDirection: 'column', minHeight: 200,
                    background: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    border: `1px solid ${snapshot.isDraggingOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-lg)', transition: 'background 0.15s, border-color 0.15s',
                  }}>
                  <div style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: STAGE_DOT[stage], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>{STAGE_LABELS[stage]}</span>
                    <span style={{
                      fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)', marginLeft: 'auto',
                    }}>{colLeads.length}</span>
                  </div>
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {colLeads.length === 0 && !snapshot.isDraggingOver ? (
                      <div style={{ padding: '18px 12px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: 12 }}>No leads</div>
                    ) : colLeads.map((lead, i) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={i}>
                        {(prov, snap) => (
                          <LeadCard lead={lead} onOpen={onOpen} onToggleInterest={onToggleInterest}
                            innerRef={prov.innerRef} draggableProps={prov.draggableProps}
                            dragHandleProps={prov.dragHandleProps} isDragging={snap.isDragging} />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// ── Table view ──────────────────────────────────────────────────────────────
function LeadTable({ leads, stageFilter, setStageFilter, ownerName, onOpen }) {
  const counts = useMemo(() => {
    const c = { all: leads.length };
    STAGES.forEach(s => { c[s] = leads.filter(l => l.stage === s).length; });
    return c;
  }, [leads]);

  const rows = stageFilter === 'all' ? leads : leads.filter(l => l.stage === stageFilter);
  const PILLS = [{ id: 'all', label: 'All' }, ...STAGES.map(s => ({ id: s, label: STAGE_LABELS[s] }))];

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {PILLS.map(p => (
          <button key={p.id} onClick={() => setStageFilter(p.id)} style={{
            padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit',
            background: stageFilter === p.id ? 'var(--bg-tertiary)' : 'transparent',
            color: stageFilter === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: stageFilter === p.id ? '1px solid var(--border-color)' : '1px solid transparent',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          }}>
            {p.label} <span style={{ marginLeft: 4, color: 'var(--text-tertiary)', fontWeight: 500 }}>{counts[p.id] || 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Target size={26} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No leads</div>
          <div style={{ fontSize: 13 }}>Nothing in this stage yet.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }} className="responsive-cards">
            <thead>
              <tr>
                <Th>Lead</Th><Th>Interest</Th><Th>Owner</Th>
                <Th align="right">Value</Th><Th align="center">AI score</Th><Th>Stage</Th><Th>Follow-up</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => {
                const fm = followMeta(l.followUp);
                return (
                  <tr key={l.id} onClick={() => onOpen(l)} style={{
                    borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-color)',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    <Td data-label="Lead">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
                          border: '1px solid var(--accent-primary-border)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700,
                        }}>{initials(l.company)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{l.company}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{l.contact || '—'}</div>
                        </div>
                      </div>
                    </Td>
                    <Td data-label="Interest"><InterestBadge intent={l.intent} field={l.field} /></Td>
                    <Td data-label="Owner"><span style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{ownerName(l.owner)}</span></Td>
                    <Td data-label="Value" align="right"><span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoneyFull(l.value)}</span></Td>
                    <Td data-label="AI score" align="center"><div style={{ display: 'inline-flex' }}><ScoreRing score={l.score} size={34} stroke={3.5} /></div></Td>
                    <Td data-label="Stage">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 999,
                        fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                      }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: STAGE_DOT[l.stage] }} />{STAGE_LABELS[l.stage]}</span>
                    </Td>
                    <Td data-label="Follow-up">
                      {fm.label ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999,
                          fontSize: '0.6875rem', fontWeight: 700,
                          color: fm.due ? 'var(--alert-error-text)' : 'var(--text-secondary)',
                          background: fm.due ? 'var(--alert-error-bg)' : 'var(--bg-tertiary)',
                          border: `1px solid ${fm.due ? 'var(--alert-error-border)' : 'var(--border-color)'}`,
                        }}><Clock size={10} />{fm.label}</span>
                      ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── AI Focus ────────────────────────────────────────────────────────────────
function AIFocus({ leads, onOpen }) {
  const open = leads.filter(isOpen);
  const queue = [...open].sort((a, b) => urgencyRank(b) - urgencyRank(a) || b.score - a.score);
  const overdue = open.filter(l => followMeta(l.followUp).overdue).sort((a, b) => b.score - a.score);
  const top = [...open].sort((a, b) => (b.score * b.value) - (a.score * a.value)).slice(0, 4);

  // weighted-to-close = sum(value * score/100) over open leads
  const weighted = open.reduce((acc, l) => acc + (l.value * l.score / 100), 0);
  const avgScore = open.length ? Math.round(open.reduce((a, l) => a + l.score, 0) / open.length) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }} className="leads-focus">
      {/* Work these next */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} style={{ color: 'var(--accent-primary-text)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Work these next</span>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-tertiary)' }}>ranked by urgency, then score</span>
        </div>
        {queue.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nothing open. Inbox zero.</div>
        ) : queue.map((l, i) => {
          const fm = followMeta(l.followUp);
          return (
            <div key={l.id} onClick={() => onOpen(l)} style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              borderBottom: i === queue.length - 1 ? 'none' : '1px solid var(--border-color)', transition: 'background 0.12s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ width: 20, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{i + 1}</span>
              <ScoreRing score={l.score} size={36} stroke={3.5} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{l.company}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <InterestBadge intent={l.intent} field={l.field} />
                  {fm.label && <span style={{ fontSize: 11, fontWeight: 700, color: fm.due ? 'var(--alert-error-text)' : 'var(--text-tertiary)' }}>{fm.label}</span>}
                </div>
                {l.nextStep && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                    <Sparkles size={11} style={{ color: 'var(--accent-primary-text)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.nextStep}</span>
                  </div>
                )}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            </div>
          );
        })}
      </div>

      {/* Insights panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)',
          borderRadius: 'var(--radius-lg)', padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Sparkles size={14} style={{ color: 'var(--accent-primary-text)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-primary-text)' }}>Skillhub AI summary</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--text-primary)', lineHeight: 1 }}>{fmtMoneyFull(weighted)}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Weighted to close</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--text-primary)', lineHeight: 1 }}>{avgScore}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Avg score</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--accent-success-text)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Top opportunities</span>
          </div>
          {top.map((l, i) => (
            <div key={l.id} onClick={() => onOpen(l)} style={{
              padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              borderBottom: i === top.length - 1 ? 'none' : '1px solid var(--border-color)',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: tierTone(l.score).ring, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company}</span>
              <span style={{ fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtMoneyFull(l.value)}</span>
            </div>
          ))}
        </div>

        <div style={{
          background: overdue.length ? 'var(--alert-error-bg)' : 'var(--bg-secondary)',
          border: `1px solid ${overdue.length ? 'var(--alert-error-border)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)', padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: overdue.length ? 10 : 0 }}>
            <AlertTriangle size={14} style={{ color: overdue.length ? 'var(--alert-error-text)' : 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: overdue.length ? 'var(--alert-error-text)' : 'var(--text-secondary)' }}>
              At risk{overdue.length ? ` · ${overdue.length} overdue` : ' · all clear'}
            </span>
          </div>
          {overdue.map(l => (
            <div key={l.id} onClick={() => onOpen(l)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', cursor: 'pointer' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{l.company}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--alert-error-text)' }}>{followMeta(l.followUp).label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KPI helpers ──────────────────────────────────────────────────────────────
function KpiHero({ label, value, leads }) {
  // 6-bar mini sparkline of open pipeline value bucketed by stage progression
  const bars = BOARD_STAGES.map(s => leads.filter(l => l.stage === s).reduce((a, l) => a + (Number(l.value) || 0), 0));
  bars.push(leads.filter(l => l.stage === 'lost').reduce((a, l) => a + (Number(l.value) || 0), 0));
  const max = Math.max(1, ...bars);
  return (
    <div style={{ padding: '18px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary-text)', fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 999,
          background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)', border: '1px solid var(--accent-success-border)',
          fontSize: 10.5, fontWeight: 700,
        }}><ArrowUpRight size={10} />+18%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 32 }}>
        {bars.map((b, i) => (
          <div key={i} style={{
            flex: 1, height: Math.max(3, Math.round((b / max) * 32)), borderRadius: '3px 3px 0 0',
            background: i === BOARD_STAGES.length - 1 ? 'var(--accent-primary)' : 'var(--accent-primary-muted)',
            border: '1px solid var(--accent-primary-border)',
          }} />
        ))}
      </div>
    </div>
  );
}

function Kpi({ tone = 'neutral', label, value, sub, onClick }) {
  const color = {
    accent: 'var(--accent-primary-text)', success: 'var(--accent-success-text)',
    warning: 'var(--accent-warning-text)', neutral: 'var(--text-primary)',
  }[tone];
  return (
    <div onClick={onClick} style={{
      padding: '14px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 6,
      cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.12s',
    }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.borderColor = 'var(--accent-primary-border)'; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; } : undefined}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
    </div>
  );
}

const Th = ({ children, align = 'left' }) => (
  <th style={{ padding: '10px 14px', textAlign: align, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)' }}>{children}</th>
);
const Td = ({ children, align = 'left', ...rest }) => (
  <td {...rest} style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: align }}>{children}</td>
);
