import React from 'react';

/**
 * LoadingSpinner — centered cyan ring spinner.
 *
 * Props:
 *   text     string   optional message below spinner
 *   size     number   diameter in px (default 40)
 *   inline   bool     if true, renders inline (no centering wrapper)
 */
export default function LoadingSpinner({ text, size = 40, inline = false }) {
  const spinner = (
    <div
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size * 0.075)}px solid rgba(0,240,255,0.12)`,
        borderTop: `${Math.max(2, size * 0.075)}px solid var(--color-accent-primary)`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
        boxShadow: '0 0 12px rgba(0,240,255,0.2)',
      }}
    />
  );

  if (inline) {
    return spinner;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '64px 32px',
        width: '100%',
      }}
    >
      {spinner}
      {text && (
        <p
          style={{
            fontSize: 'var(--text-md)',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
