import React, { useEffect, useRef } from 'react';

/**
 * SolvencyGauge — animated semicircular SVG arc gauge.
 *
 * Props:
 *   score      0-100   numeric solvency score
 *   size       number  total diameter (default 200)
 *   showLabel  bool    show rating label below score (default true)
 */
export default function SolvencyGauge({ score = 0, size = 200, showLabel = true }) {
  const arcRef = useRef(null);

  // ── Derived values ───────────────────────────────────────────────
  const clampedScore = Math.min(100, Math.max(0, score));

  // Color based on score band
  const arcColor =
    clampedScore >= 70 ? '#00f0ff'
    : clampedScore >= 40 ? '#f59e0b'
    : '#ef4444';

  const glowColor =
    clampedScore >= 70 ? 'rgba(0,240,255,0.35)'
    : clampedScore >= 40 ? 'rgba(245,158,11,0.35)'
    : 'rgba(239,68,68,0.35)';

  const rating =
    clampedScore >= 70 ? 'Strong'
    : clampedScore >= 40 ? 'Developing'
    : 'At Risk';

  // ── SVG geometry ─────────────────────────────────────────────────
  const stroke      = size * 0.075;        // arc thickness scales with size
  const radius      = (size - stroke) / 2; // radius of the arc centre-line
  const cx          = size / 2;
  const cy          = size / 2;

  // The arc spans 200° (from 190° → 350° going clockwise)
  // = starting from bottom-left, sweeping right across the top, ending bottom-right
  const startAngle  = 190; // degrees
  const sweepDeg    = 200; // total arc degrees

  // Convert degrees → radians helpers
  const toRad = (deg) => (deg * Math.PI) / 180;

  const pointOnCircle = (angleDeg) => ({
    x: cx + radius * Math.cos(toRad(angleDeg)),
    y: cy + radius * Math.sin(toRad(angleDeg)),
  });

  const start   = pointOnCircle(startAngle);
  const end     = pointOnCircle(startAngle + sweepDeg);
  const largeArc = sweepDeg > 180 ? 1 : 0;

  // Full arc path (background)
  const bgPath = [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
  ].join(' ');

  // Foreground arc (score portion)
  const scoreSweep  = (clampedScore / 100) * sweepDeg;
  const scoreEnd    = pointOnCircle(startAngle + scoreSweep);
  const scoreLarge  = scoreSweep > 180 ? 1 : 0;

  const fgPath = [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${scoreLarge} 1 ${scoreEnd.x} ${scoreEnd.y}`,
  ].join(' ');

  // ── Arc length for animation ──────────────────────────────────────
  // Approx circumference of full 200° arc
  const fullArcLength = (sweepDeg / 360) * (2 * Math.PI * radius);
  const scoreArcLength = (clampedScore / 100) * fullArcLength;

  useEffect(() => {
    if (!arcRef.current) return;
    const el = arcRef.current;
    const totalLen = el.getTotalLength?.() ?? fullArcLength;

    el.style.strokeDasharray  = totalLen;
    el.style.strokeDashoffset = totalLen;

    // Trigger animation frame after mount
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.strokeDashoffset = totalLen - scoreArcLength;
    });

    return () => cancelAnimationFrame(raf);
  }, [clampedScore, fullArcLength, scoreArcLength]);

  // Font sizes scale with gauge size
  const scoreFontSize  = size * 0.22;
  const ratingFontSize = size * 0.09;

  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      {/* Glow layer behind SVG */}
      {clampedScore > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: `0 0 ${size * 0.2}px ${glowColor}`,
            opacity: 0.6,
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`Solvency score: ${clampedScore} — ${rating}`}
        role="img"
      >
        <defs>
          <filter id={`glow-${size}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc track */}
        <path
          d={bgPath}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Score arc */}
        {clampedScore > 0 && (
          <path
            ref={arcRef}
            d={fgPath}
            fill="none"
            stroke={arcColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            filter={`url(#glow-${size})`}
          />
        )}

        {/* Score number */}
        <text
          x={cx}
          y={cy + scoreFontSize * 0.35}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={arcColor}
          fontSize={scoreFontSize}
          fontFamily="'JetBrains Mono', 'Fira Code', monospace"
          fontWeight="700"
          letterSpacing="-1"
        >
          {clampedScore}
        </text>

        {/* Rating label */}
        {showLabel && (
          <text
            x={cx}
            y={cy + scoreFontSize * 0.35 + ratingFontSize * 1.6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(113,113,122,0.9)"
            fontSize={ratingFontSize}
            fontFamily="'DM Sans', system-ui, sans-serif"
            fontWeight="500"
            letterSpacing="0.05em"
          >
            {rating.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
}
