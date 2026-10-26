import { useState, useEffect, useRef } from 'react';
import { users } from '../api/client.js';
import { wsBaseUrl } from '../config.js';

export default function IntelligenceTerminal({ reportId }) {
 const [logs, setLogs] = useState([]);
 const [finalScore, setFinalScore] = useState(null);
 const [error, setError] = useState(null);
 const wsRef = useRef(null);
 const terminalEndRef = useRef(null);

 // Auto-scroll to bottom
 useEffect(() => {
 if (terminalEndRef.current) {
 terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
 }
 }, [logs]);

 useEffect(() => {
 let isMounted = true;

 async function initTerminal() {
 try {
 const res = await users.me();
 const orgId = res.data.organization_id;
 
 if (!orgId) {
 if (isMounted) setError('Organization ID not found.');
 return;
 }

 let wsUrl = `${wsBaseUrl()}/ws/terminal/${orgId}`;
 if (reportId) {
 wsUrl += `?report_id=${reportId}`;
 }
 const ws = new WebSocket(wsUrl);
 wsRef.current = ws;

 ws.onopen = () => {
 if (isMounted) {
 setLogs([{ agent: 'system', status: 'info', message: 'Terminal connected. Awaiting telemetry...', payload: {} }]);
 }
 };

 ws.onmessage = (event) => {
 if (!isMounted) return;
 try {
 const data = JSON.parse(event.data);
 setLogs((prevLogs) => [...prevLogs, data]);
 
 if (data.status === 'completed') {
 const score = data.payload?.overall_score;
 if (score !== undefined) {
 setFinalScore(score);
 }
 }
 } catch (e) {
 console.error('Failed to parse WebSocket message', e);
 }
 };

 ws.onerror = () => {
 if (isMounted) setError('WebSocket connection error.');
 };

 ws.onclose = () => {
 if (isMounted) {
 setLogs((prevLogs) => [...prevLogs, { agent: 'system', status: 'info', message: 'Connection closed.', payload: {} }]);
 }
 };
 } catch (e) {
 if (isMounted) setError('Failed to initialize terminal context.');
 }
 }

 initTerminal();

 return () => {
 isMounted = false;
 if (wsRef.current) {
 wsRef.current.close();
 }
 };
 }, []);

 const getAgentColor = (agent) => {
 switch (agent) {
 case 'data_quant': return 'var(--color-status-info, #3b82f6)'; // Blue
 case 'underwriter': return 'var(--color-accent-primary, #a855f7)'; // Purple
 case 'auditor': return 'var(--color-status-warning, #f97316)'; // Orange
 case 'system': return 'var(--color-text-secondary, #9ca3af)'; // Gray
 default: return 'var(--color-text-secondary, #9ca3af)';
 }
 };

 return (
 <div className="intelligence-terminal">
 <div className="terminal-header">
 <div className="terminal-title">Intelligence Terminal</div>
 <div className="terminal-status">
 <div className={`status-dot ${error ? 'error' : 'active'}`}></div>
 {error ? 'Error' : 'Live Telemetry'}
 </div>
 </div>
 
 <div className="terminal-body">
 {error && <div className="terminal-error">{error}</div>}
 
 {logs.map((log, index) => (
 <div key={index} className="terminal-log">
 <span className="log-timestamp">{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
 <span className="log-agent" style={{ color: getAgentColor(log.agent) }}>
 [{log.agent.toUpperCase()}]
 </span>
 <span className={`log-message ${log.status === 'error' ? 'log-error' : ''}`}>
 {log.message}
 </span>
 </div>
 ))}
 
 {finalScore !== null && finalScore !== 'N/A' && (
 <div className="terminal-score-reveal animate-fadeIn">
 <div className="score-label">FINAL VERDICT SCORE</div>
 <div className="score-value" style={{ 
 color: finalScore >= 70 ? 'var(--color-status-success)' : 
 finalScore >= 40 ? 'var(--color-status-warning)' : 
 'var(--color-status-error)' 
 }}>
 {finalScore} <span className="score-max">/ 100</span>
 </div>
 </div>
 )}
 
 <div ref={terminalEndRef} />
 </div>

 <style>{`
 .intelligence-terminal {
 background: var(--color-surface-elevated, #111827);
 border: 1px solid var(--color-border, #374151);
 border-radius: var(--radius-lg, 12px);
 overflow: hidden;
 display: flex;
 flex-direction: column;
 font-family: 'JetBrains Mono', var(--font-mono, monospace);
 height: 400px;
 box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
 margin-top: var(--space-6, 24px);
 }
 
 .terminal-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 12px 16px;
 background: rgba(0, 0, 0, 0.4);
 border-bottom: 1px solid var(--color-border, #374151);
 }
 
 .terminal-title {
 font-size: 12px;
 text-transform: uppercase;
 letter-spacing: 0.1em;
 color: var(--color-text-secondary, #9ca3af);
 font-weight: 600;
 }
 
 .terminal-status {
 display: flex;
 align-items: center;
 gap: 6px;
 font-size: 11px;
 color: var(--color-text-secondary, #9ca3af);
 }
 
 .status-dot {
 width: 8px;
 height: 8px;
 border-radius: 50%;
 }
 
 .status-dot.active {
 background: var(--color-status-success, #10b981);
 box-shadow: 0 0 8px var(--color-status-success, #10b981);
 animation: pulse 2s infinite;
 }
 
 .status-dot.error {
 background: var(--color-status-error, #ef4444);
 }
 
 .terminal-body {
 padding: 16px;
 overflow-y: auto;
 flex: 1;
 display: flex;
 flex-direction: column;
 gap: 8px;
 }
 
 .terminal-body::-webkit-scrollbar {
 width: 8px;
 }
 
 .terminal-body::-webkit-scrollbar-track {
 background: transparent;
 }
 
 .terminal-body::-webkit-scrollbar-thumb {
 background: var(--color-border-subtle, #4b5563);
 border-radius: 4px;
 }
 
 .terminal-log {
 display: flex;
 align-items: flex-start;
 gap: 12px;
 font-size: 13px;
 line-height: 1.5;
 word-break: break-word;
 animation: slideIn 0.3s ease-out forwards;
 }
 
 .log-timestamp {
 color: var(--color-text-tertiary, #6b7280);
 flex-shrink: 0;
 }
 
 .log-agent {
 font-weight: 600;
 flex-shrink: 0;
 width: 120px;
 }
 
 .log-message {
 color: var(--color-text-primary, #f3f4f6);
 flex: 1;
 }
 
 .log-error {
 color: var(--color-status-error, #ef4444);
 }
 
 .terminal-error {
 color: var(--color-status-error, #ef4444);
 padding: 8px;
 background: rgba(239, 68, 68, 0.1);
 border-radius: 4px;
 font-size: 13px;
 }
 
 .terminal-score-reveal {
 margin-top: 24px;
 padding: 20px;
 border: 1px dashed var(--color-border, #374151);
 border-radius: 8px;
 text-align: center;
 background: rgba(0, 0, 0, 0.2);
 }
 
 .score-label {
 font-size: 12px;
 color: var(--color-text-secondary, #9ca3af);
 letter-spacing: 0.15em;
 margin-bottom: 8px;
 }
 
 .score-value {
 font-size: 48px;
 font-weight: 700;
 line-height: 1;
 }
 
 .score-max {
 font-size: 24px;
 color: var(--color-text-tertiary, #6b7280);
 font-weight: 400;
 }
 
 @keyframes pulse {
 0% { opacity: 0.6; }
 50% { opacity: 1; }
 100% { opacity: 0.6; }
 }
 
 @keyframes slideIn {
 from { opacity: 0; transform: translateY(4px); }
 to { opacity: 1; transform: translateY(0); }
 }
 `}</style>
 </div>
 );
}
