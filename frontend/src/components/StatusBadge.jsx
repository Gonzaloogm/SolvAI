import React from 'react';

/**
 * StatusBadge — renders a colored pill badge for a given status string.
 * Supports: CONNECTED, DISCONNECTED, ERROR, PENDING, GENERATING, COMPLETED, FAILED, DRAFT, PROCESSING, COMPLETE
 */
export default function StatusBadge({ status }) {
 if (!status) return null;

 const normalized = status.toUpperCase();

 const classMap = {
 CONNECTED: 'badge-complete',
 COMPLETED: 'badge-complete',
 COMPLETE: 'badge-complete',
 DISCONNECTED: 'badge-failed',
 FAILED: 'badge-failed',
 ERROR: 'badge-failed',
 PENDING: 'badge-draft',
 DRAFT: 'badge-draft',
 GENERATING: 'badge-processing',
 PROCESSING: 'badge-processing',
 };

 const labelMap = {
 CONNECTED: 'Connected',
 COMPLETED: 'Completed',
 COMPLETE: 'Complete',
 DISCONNECTED: 'Disconnected',
 FAILED: 'Failed',
 ERROR: 'Error',
 PENDING: 'Pending',
 DRAFT: 'Draft',
 GENERATING: 'Generating',
 PROCESSING: 'Processing',
 };

 const cls = classMap[normalized] ?? 'badge-draft';
 const label = labelMap[normalized] ?? status;

 return <span className={cls}>{label}</span>;
}
