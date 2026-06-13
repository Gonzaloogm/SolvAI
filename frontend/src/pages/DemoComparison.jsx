import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { solvencyReports } from '../api/client.js';

export default function DemoComparison() {
  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual State
  const [transactions, setTransactions] = useState([]);
  const [manualTime, setManualTime] = useState(0);
  const [manualRunning, setManualRunning] = useState(false);
  const manualInterval = useRef(null);
  const [manualDone, setManualDone] = useState(false);

  // AI State
  const [aiReport, setAiReport] = useState(null);
  const [aiTime, setAiTime] = useState(0);
  const [aiRunning, setAiRunning] = useState(false);
  const aiInterval = useRef(null);
  const [aiDone, setAiDone] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);

  useEffect(() => {
    solvencyReports.getDemoTransactions().then(res => {
      setTransactions(res.data);
    }).catch(console.error);
  }, []);

  const startManual = () => {
    setManualTime(0);
    setManualDone(false);
    setManualRunning(true);
    manualInterval.current = setInterval(() => {
      setManualTime(prev => prev + 0.1);
    }, 100);
  };

  const stopManual = () => {
    clearInterval(manualInterval.current);
    setManualRunning(false);
    setManualDone(true);
  };

  const startAi = async () => {
    setAiTime(0);
    setAiDone(false);
    setAiRunning(true);
    setAiReport(null);
    aiInterval.current = setInterval(() => {
      setAiTime(prev => prev + 0.1);
    }, 100);

    try {
      const res = await solvencyReports.create();
      const reportId = res.data.id;
      
      const pInt = setInterval(async () => {
        try {
          const r = await solvencyReports.get(reportId);
          setAiReport(r.data);
          if (r.data.status === 'COMPLETED' || r.data.status === 'FAILED' || r.data.status === 'ERROR') {
            clearInterval(pInt);
            clearInterval(aiInterval.current);
            setAiRunning(false);
            setAiDone(true);
          }
        } catch (e) {
          console.error(e);
          clearInterval(pInt);
          clearInterval(aiInterval.current);
          setAiRunning(false);
          setAiDone(true);
        }
      }, 2000);
      setPollInterval(pInt);
    } catch (e) {
      console.error(e);
      clearInterval(aiInterval.current);
      setAiRunning(false);
      setAiDone(true);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(manualInterval.current);
      clearInterval(aiInterval.current);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const formatTime = (time) => time.toFixed(1) + 's';

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="page-content">
        <div className="content-area">
          <div className="section-header">
            <div>
              <h1 className="section-title">Before / After Comparison</h1>
              <p className="section-subtitle">Traditional Underwriting vs Self-Serve Explainable AI</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              id="tab-manual"
              className={`btn-primary ${activeTab === 'manual' ? '' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('manual')}>Manual Assessment
            </button>
            <button 
              id="tab-ai"
              className={`btn-primary ${activeTab === 'ai' ? '' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('ai')}>Explainable AI Report
            </button>
          </div>

          <div className="card" style={{ minHeight: '600px' }}>
            {activeTab === 'manual' && (
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <h3>Raw Transactions ({transactions.length})</h3>
                  <div style={{ maxHeight: '500px', overflowY: 'auto', background: 'var(--color-surface-elevated)', padding: '1rem', borderRadius: '8px' }}>
                    <table className="db-table" style={{ width: '100%', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(t => (
                          <tr key={t.id}>
                            <td>{new Date(t.created * 1000).toLocaleDateString()}</td>
                            <td style={{ color: 'var(--color-accent-primary)' }}>€{(t.amount / 100).toFixed(2)}</td>
                            <td>{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ width: '300px', padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                  <h3>Manual Assessment Form</h3>
                  <div id="manual-timer" style={{ fontSize: '2.5rem', fontFamily: 'monospace', color: 'var(--color-accent-primary)', marginBottom: '1rem', fontWeight: 700 }}>
                    ⏱ {formatTime(manualTime)}
                  </div>
                  {!manualRunning && !manualDone ? (
                    <button id="start-manual" className="btn-primary" onClick={startManual} style={{ width: '100%' }}>Start Manual Review</button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Income Stability (1-100)</label>
                        <input type="number" style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }} disabled={!manualRunning} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Seasonality (1-100)</label>
                        <input type="number" style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }} disabled={!manualRunning} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Overall Solvency Score</label>
                        <input type="number" style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }} disabled={!manualRunning} />
                      </div>
                      <button id="stop-manual" className="btn-primary" disabled={!manualRunning} onClick={stopManual} style={{ width: '100%' }}>Submit Assessment</button>
                    </div>
                  )}
                  {manualDone && <div style={{ marginTop: '1rem', color: 'var(--color-status-success)', fontWeight: 'bold' }}>Completed in {formatTime(manualTime)}!</div>}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
                <h3>Self-Serve Explainable AI Pipeline</h3>
                <div id="ai-timer" style={{ fontSize: '4rem', fontFamily: 'monospace', color: 'var(--color-accent-primary)', fontWeight: 700 }}>
                  ⏱ {formatTime(aiTime)}
                </div>
                {!aiRunning && !aiDone ? (
                  <button id="start-ai" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.2rem' }} onClick={startAi}>
                    ⚡ Run Gemini Pipeline
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
                    {aiRunning ? (
                      <div><LoadingSpinner text="AI is analyzing transactions, assessing metrics, and generating narrative..." /></div>
                    ) : (
                      <div className="card-glass" style={{ padding: '2rem' }}>
                        <h2 style={{ color: 'var(--color-status-success)', marginBottom: '1rem' }}>Report Completed!</h2>
                        <div style={{ fontSize: '3rem', margin: '1rem 0', fontFamily: 'var(--font-data)', fontWeight: 700 }}>
                          Score: {aiReport?.solvency_score ?? aiReport?.report_data?.solvency_score} / 100
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Generated automatically in {formatTime(aiTime)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
