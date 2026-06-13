import React from 'react';

/**
 * MetricCard — displays a single solvency metric with score bar.
 *
 * Props:
 *   title       string   metric name
 *   score       0-100    numeric score
 *   description string   short explanation
 *   icon        string   emoji or icon character
 */
export default function MetricCard({ title, score = 0, description, icon }) {
  const clampedScore = Math.min(100, Math.max(0, score));

  const barColor =
    clampedScore >= 70 ? 'var(--color-accent-primary)'
    : clampedScore >= 40 ? 'var(--color-status-warning)'
    : 'var(--color-status-error)';

  const textColor =
    clampedScore >= 70 ? 'var(--color-accent-primary)'
    : clampedScore >= 40 ? 'var(--color-status-warning)'
    : 'var(--color-status-error)';

  return (
    <div className="metric-card">
      <div className="metric-card__header">
        {icon && <span className="metric-card__icon">{icon}</span>}
        <span className="metric-card__title">{title}</span>
        <span className="metric-card__score" style={{ color: textColor }}>
          {clampedScore}
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track" style={{ margin: '8px 0' }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${clampedScore}%`,
            background: barColor,
            boxShadow: clampedScore >= 70
              ? '0 0 8px rgba(0,240,255,0.4)'
              : clampedScore >= 40
              ? '0 0 8px rgba(245,158,11,0.4)'
              : '0 0 8px rgba(239,68,68,0.4)',
          }}
        />
      </div>

      {description && (
        <p className="metric-card__description">{description}</p>
      )}

      <style>{`
        .metric-card {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
          animation: slideInUp 0.35s ease;
        }
        .metric-card:hover {
          border-color: rgba(255,255,255,0.1);
          box-shadow: var(--shadow-md);
        }
        .metric-card__header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }
        .metric-card__icon {
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }
        .metric-card__title {
          flex: 1;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .metric-card__score {
          font-family: var(--font-data);
          font-size: var(--text-xl);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -1px;
        }
        .metric-card__description {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          line-height: 1.5;
          margin-top: var(--space-2);
        }
      `}</style>
    </div>
  );
}
