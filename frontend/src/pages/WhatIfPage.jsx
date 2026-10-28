import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Loader2, RotateCcw } from 'lucide-react';
import { simulate } from '../api/client.js';

const cn = (...classes) => classes.filter(Boolean).join(' ');
const NO_CHANGE = { revenue_change_percent: 0, smoothing_percent: 0, top_client_percent: null };

const euro = (v) => (v == null ? '—' : `€${Number(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`);
const pct = (v, digits = 1) => (v == null ? '—' : `${Number(v).toFixed(digits)}%`);

// Levels are risk levels: better means lower risk
const LEVEL_RANK = {
  LOW: 0, UNCONCENTRATED: 0, GROWING: 0,
  MODERATE: 1, STABLE: 1,
  HIGH: 2, DECLINING: 2,
};

// Each row: how to read it from a metrics view, how to show it, and whether a higher value is better
const ROWS = [
  { key: 'avg', get: (m) => m.average_monthly_revenue, fmt: euro, higherIsBetter: true },
  { key: 'cov', get: (m) => m.volatility.cov_percent, fmt: (v) => pct(v), level: (m) => m.volatility.level, higherIsBetter: false },
  { key: 'trend', get: (m) => m.trend.slope_percent_per_month, fmt: (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%/mo`), level: (m) => m.trend.direction, higherIsBetter: true },
  { key: 'weak', get: (m) => m.weak_months.weak, fmt: (v) => (v == null ? '—' : String(v)), higherIsBetter: false },
  { key: 'top', get: (m) => m.client_concentration.top_client_percent, fmt: (v) => pct(v), higherIsBetter: false },
  { key: 'hhi', get: (m) => m.client_concentration.hhi, fmt: (v) => (v == null ? '—' : v.toLocaleString('en-GB')), level: (m) => m.client_concentration.level, higherIsBetter: false },
  { key: 'mortgage', get: (m) => m.mortgage.estimated_max_mortgage, fmt: euro, higherIsBetter: true },
  { key: 'capacity', get: (m) => m.mortgage.estimated_monthly_payment_capacity, fmt: euro, higherIsBetter: true },
];

function LevelBadge({ level }) {
  if (!level || level === 'UNKNOWN') return null;
  const rank = LEVEL_RANK[level];
  const tone = rank === 0 ? 'bg-[#ecfdf5] text-[#1a9e6e]' : rank === 2 ? 'bg-[#fef2f2] text-[#df1b41]' : 'bg-[#fff4e5] text-[#b25e09]';
  return <span className={cn('block w-fit ml-auto mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{level.toLowerCase()}</span>;
}

function Slider({ label, hint, value, min, max, step, format, onChange, disabled }) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-medium text-primary">{label}</label>
        <span className="text-sm font-semibold text-[var(--brand-blue)]">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-[var(--brand-blue)]"
      />
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  );
}

export default function WhatIfPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [levers, setLevers] = useState(NO_CHANGE);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  // Debounced: sliders fire many events, only the last request's answer is shown
  useEffect(() => {
    const id = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await simulate.whatIf(levers);
        if (id === latest.current) { setResult(res.data); setError(null); }
      } catch (err) {
        if (id === latest.current) setError(err.response?.data?.detail || t('simulator.error'));
      } finally {
        if (id === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [levers, t]);

  const set = (key) => (value) => setLevers((prev) => ({ ...prev, [key]: value }));
  const baseTop = result?.baseline.client_concentration.top_client_percent;
  const topValue = levers.top_client_percent ?? baseTop ?? 50;
  const changed = JSON.stringify(levers) !== JSON.stringify(NO_CHANGE);

  if (error && !result) {
    return (
      <div className="page-enter">
        <h1 className="text-xl font-semibold text-primary">{t('simulator.title')}</h1>
        <div className="bg-card border border-border rounded-lg p-6 mt-6 text-center">
          <p className="text-sm text-primary">{error}</p>
          <button onClick={() => navigate('/data-sources')} className="mt-4 bg-[var(--brand-blue)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--brand-blue-hover)]">
            {t('simulator.connect')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t('simulator.title')}</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">{t('simulator.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-blue)]" />}
      </div>

      <div className="grid grid-cols-5 gap-6 mt-6">
        <div className="col-span-2 bg-card border border-border rounded-lg p-5 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-primary">{t('simulator.levers')}</h2>
            <button
              onClick={() => setLevers(NO_CHANGE)} disabled={!changed}
              className="text-sm text-muted hover:text-primary flex items-center gap-1 disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t('simulator.reset')}
            </button>
          </div>
          <Slider
            label={t('simulator.revenue')} hint={t('simulator.revenueHint')}
            value={levers.revenue_change_percent} min={-50} max={50} step={5}
            format={(v) => `${v > 0 ? '+' : ''}${v}%`} onChange={set('revenue_change_percent')}
          />
          <Slider
            label={t('simulator.smoothing')} hint={t('simulator.smoothingHint')}
            value={levers.smoothing_percent} min={0} max={100} step={10}
            format={(v) => `${v}%`} onChange={set('smoothing_percent')}
          />
          <Slider
            label={t('simulator.topClient')} hint={t('simulator.topClientHint')}
            value={topValue} min={5} max={100} step={1}
            format={(v) => `${Math.round(v)}%`} onChange={set('top_client_percent')}
            disabled={baseTop == null}
          />
        </div>

        <div className="col-span-3 bg-card border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold text-primary">{t('simulator.metrics')}</h2>
          {result && (
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase tracking-wider">
                  <th className="text-left font-medium py-2">{t('simulator.metric')}</th>
                  <th className="text-right font-medium py-2">{t('simulator.today')}</th>
                  <th className="text-right font-medium py-2">{t('simulator.scenario')}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const before = row.get(result.baseline);
                  const after = row.get(result.scenario);
                  const moved = before != null && after != null && Math.abs(after - before) > 1e-9;
                  const better = moved && (after > before) === row.higherIsBetter;
                  const Arrow = moved && after > before ? ArrowUpRight : ArrowDownRight;
                  return (
                    <tr key={row.key} className="border-t border-border">
                      <td className="py-2.5 text-primary">{t(`simulator.row.${row.key}`)}</td>
                      <td className="py-2.5 text-right text-muted whitespace-nowrap">
                        {row.fmt(before)}{row.level && <LevelBadge level={row.level(result.baseline)} />}
                      </td>
                      <td className={cn('py-2.5 text-right font-medium whitespace-nowrap', moved ? (better ? 'text-[#1a9e6e]' : 'text-[#df1b41]') : 'text-primary')}>
                        {moved && <Arrow className="inline w-3.5 h-3.5 mr-1" />}
                        {row.fmt(after)}{row.level && <LevelBadge level={row.level(result.scenario)} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted mt-4">
            {t('simulator.note', { months: result?.baseline.months_analyzed ?? '—', platforms: (result?.platforms || []).join(' + ') })}
          </p>
        </div>
      </div>
    </div>
  );
}
