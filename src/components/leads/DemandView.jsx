import React from 'react';
import { BarChart3, Repeat, Boxes, HelpCircle, TrendingUp, Sparkles } from 'lucide-react';
import { leadService, fmtMoneyFull } from '../../lib/services/leadService';

// Demand — the SaaS-opportunity view. Aggregates subscription interest by
// field and recommends building a SaaS where >=2 clients want to subscribe.
export default function DemandView({ leads, stats }) {
  const demand = leadService.demandByField(leads);
  const buildable = demand.filter(d => d.recommend);
  const maxCombined = Math.max(1, ...demand.map(d => d.subscribe + d.build));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
        background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <Sparkles size={18} style={{ color: 'var(--accent-primary-text)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            SaaS opportunity — subscription demand by field
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3 }}>
            {buildable.length > 0
              ? <>Build a productized SaaS for <strong style={{ color: 'var(--accent-primary-text)' }}>{buildable.map(d => d.field).join(', ')}</strong> — each has 2+ clients ready to subscribe.</>
              : 'No field has reached 2 subscribers yet. Keep marking interest on calls to surface a SaaS opportunity.'}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="responsive-tiles">
        <Tile icon={<Repeat size={15} />} tone="accent" label="Want to subscribe" value={stats.subscribeCount} />
        <Tile icon={<Boxes size={15} />} tone="success" label="Want a custom build" value={stats.buildCount} />
        <Tile icon={<HelpCircle size={15} />} tone="neutral" label="Awaiting mark" value={stats.unmarkedCount} />
        <Tile icon={<TrendingUp size={15} />} tone="warning" label="Recurring potential" value={fmtMoneyFull(stats.subValueTotal)} />
      </div>

      {/* Demand by field */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={15} style={{ color: 'var(--accent-primary-text)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Demand by field</span>
        </div>

        {demand.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <BarChart3 size={26} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No marked interest yet</div>
            <div style={{ fontSize: 13 }}>Mark leads as Subscribe or Build to populate the demand signal.</div>
          </div>
        ) : demand.map((d, i) => {
          const subW = (d.subscribe / maxCombined) * 100;
          const buildW = (d.build / maxCombined) * 100;
          return (
            <div key={d.field} style={{
              padding: '14px 16px', borderBottom: i === demand.length - 1 ? 'none' : '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{d.field}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    {d.subscribe} subscribe · {d.build} want a build
                  </span>
                </div>
                {/* demand bar */}
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                  <div style={{ width: `${subW}%`, background: 'var(--accent-primary)' }} title={`${d.subscribe} subscribe`} />
                  <div style={{ width: `${buildW}%`, background: 'var(--accent-success-text)' }} title={`${d.build} build`} />
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--text-primary)' }}>
                  {fmtMoneyFull(d.subValue)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>subscriber value</div>
              </div>

              <span style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.03em', textTransform: 'uppercase',
                color: d.recommend ? 'var(--accent-success-text)' : 'var(--text-tertiary)',
                background: d.recommend ? 'var(--accent-success-muted)' : 'var(--bg-tertiary)',
                border: `1px solid ${d.recommend ? 'var(--accent-success-border)' : 'var(--border-color)'}`,
              }}>
                {d.recommend ? 'Build SaaS' : 'Emerging'}
              </span>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 16, paddingLeft: 4 }}>
        <Legend color="var(--accent-primary)" label="Subscribe" />
        <Legend color="var(--accent-success-text)" label="Custom build" />
      </div>
    </div>
  );
}

function Tile({ icon, label, value, tone }) {
  const color = {
    accent: 'var(--accent-primary-text)', success: 'var(--accent-success-text)',
    warning: 'var(--accent-warning-text)', neutral: 'var(--text-primary)',
  }[tone];
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

const Legend = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
    <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />{label}
  </span>
);
