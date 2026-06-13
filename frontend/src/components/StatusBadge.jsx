import React from 'react';

/**
 * StatusBadge — renders a colored pill badge for a given status string.
 * Supports: CONNECTED, DISCONNECTED, ERROR, PENDING, GENERATING, COMPLETED, FAILED
 */
export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = status.toUpperCase();

  const classMap = {
    CONNECTED:    'badge badge-connected',
    COMPLETED:    'badge badge-completed',
    DISCONNECTED: 'badge badge-disconnected',
    FAILED:       'badge badge-failed',
    ERROR:        'badge badge-error',
    PENDING:      'badge badge-pending',
    GENERATING:   'badge badge-generating',
  };

  const labelMap = {
    CONNECTED:    'Connected',
    COMPLETED:    'Completed',
    DISCONNECTED: 'Disconnected',
    FAILED:       'Failed',
    ERROR:        'Error',
    PENDING:      'Pending',
    GENERATING:   'Generating',
  };

  const cls = classMap[normalized] ?? 'badge badge-pending';
  const label = labelMap[normalized] ?? normalized;

  return <span className={cls}>{label}</span>;
}
