import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://solvai-api-879357866699.europe-west1.run.app';

export default function PublicReport() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/public/report/${token}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => {
        const msg = err.response?.data?.detail || 'Report not found or link has expired';
        setError(msg);
        setLoading(false);
      });
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading verified report...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        <div className="text-yellow-500 mb-4 flex justify-center"><AlertTriangle className="w-12 h-12" /></div>
        <h2 style={{ color: '#111827', marginBottom: 8 }}>Report unavailable</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>{error}</p>
        <a href="/register" style={{ background: '#6366f1', color: 'white', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          Request your own report
        </a>
      </div>
    </div>
  );

  const getScoreColor = (score) => {
    if (score >= 70) return '#059669';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  };

  const getRatingLabel = (rating) => {
    const r = (rating || '').toUpperCase();
    if (r.includes('APPROV') || r.includes('STRONG') || r.includes('EXCELLENT')) return { label: 'APPROVED', color: '#059669', bg: '#ecfdf5' };
    if (r.includes('REVIEW') || r.includes('DEVELOP') || r.includes('GOOD')) return { label: 'REVIEW', color: '#d97706', bg: '#fffbeb' };
    return { label: 'DECLINED', color: '#dc2626', bg: '#fef2f2' };
  };

  const scoreColor = getScoreColor(data.overall_score);
  const ratingInfo = getRatingLabel(data.rating);
  const generatedDate = data.generated_on ? new Date(data.generated_on).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
  const expiryDate = data.valid_until ? new Date(data.valid_until).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No expiry';

  const componentLabels = {
    income_stability: 'Income Stability',
    growth_trend: 'Growth Trend',
    seasonality: 'Seasonality',
    client_concentration: 'Client Concentration',
    reputation_signals: 'Payment Integrity',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, background: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16 }}>S</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>SolvAI</span>
        <span style={{ color: '#9ca3af', margin: '0 8px' }}>·</span>
        <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Verified Financial Assessment</span>
      </header>
      
      <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
        
        {/* Verified banner */}
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <div>
            <div style={{ fontWeight: 600, color: '#065f46', fontSize: 14 }}>Verified Document</div>
            <div style={{ color: '#047857', fontSize: 13 }}>Generated on {generatedDate} · Valid until {expiryDate}</div>
          </div>
        </div>
        
        {/* Score card */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Solvency Score</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{data.overall_score}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>out of 100</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: ratingInfo.bg, color: ratingInfo.color, border: `1px solid ${ratingInfo.color}40`, padding: '8px 20px', borderRadius: 24, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {ratingInfo.label}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Risk Level: <strong style={{ color: data.risk_level === 'LOW' ? '#059669' : data.risk_level === 'MEDIUM' ? '#d97706' : '#dc2626' }}>{data.risk_level}</strong></div>
          </div>
        </div>
        
        {/* Component scores table */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#111827' }}>Assessment Components</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Component</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.components || {}).map(([key, score]) => (
                <tr key={key} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '12px 0', fontSize: 14, color: '#374151' }}>{componentLabels[key] || key}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {score == null ? (
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>Not assessed</span>
                      ) : (
                        <>
                          <div style={{ width: 80, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${score}%`, height: '100%', background: getScoreColor(score), borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: getScoreColor(score), minWidth: 28, textAlign: 'right' }}>{score}</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Verification section */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 min-content' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#111827' }}>Verification Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Verification ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: '#374151' }}>{data.verification_id || token.slice(-8)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Verified By</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{data.verified_by || 'SolvAI'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Data Sources</div>
                <div style={{ fontSize: 14, color: '#374151' }}>
                  {(data.data_sources || []).map((src) => (src === 'PAYPAL' ? 'PayPal' : src.charAt(0) + src.slice(1).toLowerCase().replace('_', ' '))).join(', ') || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Valid Until</div>
                <div style={{ fontSize: 14, color: '#374151' }}>{expiryDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Document Type</div>
                <div style={{ fontSize: 14, color: '#374151', textTransform: 'capitalize' }}>{data.report_type || 'Solvency Report'}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <QRCode value={window.location.href} size={100} />
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, textAlign: 'center', maxWidth: 100 }}>Scan to verify online</div>
          </div>
        </div>
        
        {/* Tamper disclaimer */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔐</span> Cryptographically Verified Document
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
            This report is digitally signed and mathematically verified by SolvAI. <strong>Any modification, physical or digital, immediately invalidates the Verification ID.</strong> Never accept a printed version without scanning the QR code above to confirm authenticity on the official SolvAI platform.
          </p>
        </div>
        
        {/* What is SolvAI? Accordion */}
        <details style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24, padding: '16px 24px' }}>
          <summary style={{ fontSize: 15, fontWeight: 600, color: '#111827', cursor: 'pointer', outline: 'none' }}>
            What is SolvAI?
          </summary>
          <div style={{ marginTop: 12, fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>
              SolvAI is an AI-powered financial verification platform that connects directly to banking and accounting software. 
            </p>
            <p style={{ margin: 0 }}>
              Instead of relying on self-reported PDFs or spreadsheets which can be easily manipulated, SolvAI analyzes raw transaction data directly from the source to generate an immutable, verified assessment of financial health.
            </p>
          </div>
        </details>
        
        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <a href="/register" style={{ background: '#6366f1', color: 'white', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600, display: 'inline-block' }}>
            Request your own SolvAI report →
          </a>
          
          <a href={`mailto:fraud@solvai.app?subject=Verification%20Request%20-%20ID%3A%20${data.verification_id}`} style={{ color: '#6b7280', fontSize: 13, textDecoration: 'underline' }}>
            Flag as suspicious or request manual verification
          </a>
        </div>
        
        <footer style={{ textAlign: 'center', padding: '16px 0 40px', color: '#9ca3af', fontSize: 12 }}>
          Powered by SolvAI — AI Financial Assessment · solvai.app
        </footer>
      </main>
    </div>
  );
}
