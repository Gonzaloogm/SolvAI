import { useState } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle, Loader2,
  ArrowRight
} from 'lucide-react';
import { simulate } from '../api/client.js';

const RATINGS = {
  APPROVE: {
    label: 'Approve',
    color: '#065f46',
    bg: '#d1fae5',
    border: '#6ee7b7',
  },
  REVIEW: {
    label: 'Review',
    color: '#92400e',
    bg: '#fef3c7',
    border: '#fcd34d',
  },
  DECLINE: {
    label: 'Decline',
    color: '#991b1b',
    bg: '#fee2e2',
    border: '#fca5a5',
  },
};

const scoreColor = (score) => {
  if (score >= 70) return '#1a9e6e';
  if (score >= 50) return '#c9870c';
  return '#df1b41';
};

export default function ScoreSimulator() {
  const [form, setForm] = useState({
    monthly_revenue: 3500,
    revenue_consistency: 'medium',
    num_clients: 4,
    months_history: 12,
    top_client_pct: 30,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await simulate.score(form);
      setResult(res.data);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
        'Simulation failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const SliderField = ({
    label, name, min, max, step=1,
    format=(v) => v, hint
  }) => (
    <div style={{marginBottom:'20px'}}>
      <div style={{
        display:'flex',
        justifyContent:'space-between',
        alignItems:'baseline',
        marginBottom:'6px',
      }}>
        <label style={{
          fontSize:'13px', fontWeight:500,
          color:'var(--text-primary)',
        }}>
          {label}
        </label>
        <span style={{
          fontSize:'14px', fontWeight:600,
          color:'#0570de',
        }}>
          {format(form[name])}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={form[name]}
        onChange={e => setForm(f => ({
          ...f,
          [name]: Number(e.target.value)
        }))}
        style={{width:'100%', accentColor:'#0570de'}}
      />
      {hint && (
        <div style={{
          fontSize:'11px',
          color:'var(--text-muted)',
          marginTop:'3px',
        }}>
          {hint}
        </div>
      )}
    </div>
  );

  const PillGroup = ({label, name, options}) => (
    <div style={{marginBottom:'20px'}}>
      <label style={{
        display:'block', fontSize:'13px',
        fontWeight:500, color:'var(--text-primary)',
        marginBottom:'8px',
      }}>
        {label}
      </label>
      <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setForm(f => ({
              ...f, [name]: opt.value
            }))}
            style={{
              padding:'6px 14px',
              borderRadius:'999px',
              border: form[name] === opt.value
                ? '2px solid #0570de'
                : '1px solid var(--border-color)',
              background: form[name] === opt.value
                ? '#eff6ff'
                : 'var(--bg-card)',
              color: form[name] === opt.value
                ? '#0570de'
                : 'var(--text-secondary)',
              fontSize:'13px', fontWeight:500,
              cursor:'pointer',
              transition:'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      padding:'32px 40px',
      maxWidth:'1000px',
    }}>
      {/* Header */}
      <div style={{marginBottom:'28px'}}>
        <h1 style={{
          fontSize:'20px', fontWeight:600,
          color:'var(--text-primary)', margin:'0 0 4px',
        }}>
          Score Simulator
        </h1>
        <p style={{
          fontSize:'14px',
          color:'var(--text-secondary)', margin:0,
        }}>
          Estimate your SolvAI solvency score based
          on your financial profile
        </p>
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        gap:'24px',
      }}>

        {/* LEFT — Inputs */}
        <div style={{
          background:'var(--bg-card)',
          border:'1px solid var(--border-color)',
          borderRadius:'8px',
          padding:'24px',
        }}>
          <h2 style={{
            fontSize:'15px', fontWeight:600,
            color:'var(--text-primary)',
            margin:'0 0 20px',
          }}>
            Your Financial Profile
          </h2>

          <SliderField
            label="Monthly Revenue"
            name="monthly_revenue"
            min={500} max={20000} step={100}
            format={v =>
              `€${v.toLocaleString('de-DE')}`
            }
            hint="Your average monthly income"
          />

          <PillGroup
            label="Revenue Consistency"
            name="revenue_consistency"
            options={[
              {value:'low', label:'Variable'},
              {value:'medium', label:'Stable'},
              {value:'high', label:'Very stable'},
            ]}
          />

          <PillGroup
            label="Number of Clients"
            name="num_clients"
            options={[
              {value:1, label:'1'},
              {value:3, label:'2–3'},
              {value:6, label:'4–6'},
              {value:10, label:'7+'},
            ]}
          />

          <PillGroup
            label="History Available"
            name="months_history"
            options={[
              {value:3, label:'3 months'},
              {value:6, label:'6 months'},
              {value:12, label:'12 months'},
            ]}
          />

          <SliderField
            label="Top Client Revenue Share"
            name="top_client_pct"
            min={5} max={95} step={5}
            format={v => `${v}%`}
            hint={
              form.top_client_pct < 30
                ? 'Good diversification'
                : form.top_client_pct < 50
                  ? 'Moderate concentration'
                  : 'High concentration risk'
            }
          />

          <button
            onClick={handleSimulate}
            disabled={loading}
            style={{
              width:'100%', padding:'13px',
              background: loading ? '#93c5fd' : '#0570de',
              color:'white', border:'none',
              borderRadius:'8px', fontSize:'14px',
              fontWeight:600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center',
              justifyContent:'center', gap:'8px',
              transition:'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16}
                  style={{
                    animation:'spin 1s linear infinite'
                  }}/>
                Calculating with AI...
              </>
            ) : (
              <>
                Calculate My Score
                <ArrowRight size={16}/>
              </>
            )}
          </button>
        </div>

        {/* RIGHT — Result */}
        <div style={{
          background:'var(--bg-card)',
          border:'1px solid var(--border-color)',
          borderRadius:'8px',
          padding:'24px',
          display:'flex',
          flexDirection:'column',
        }}>
          <h2 style={{
            fontSize:'15px', fontWeight:600,
            color:'var(--text-primary)',
            margin:'0 0 20px',
          }}>
            Estimated Score
          </h2>

          {!result && !loading && !error && (
            <div style={{
              flex:1, display:'flex',
              flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              color:'var(--text-muted)',
              textAlign:'center', padding:'40px 0',
            }}>
              <TrendingUp size={40}
                color="var(--border-color)"
                style={{marginBottom:'12px'}}/>
              <p style={{
                fontSize:'14px', margin:0,
              }}>
                Adjust your profile and click
                <br/>
                <strong>Calculate</strong> to see
                your estimated score
              </p>
            </div>
          )}

          {loading && (
            <div style={{
              flex:1, display:'flex',
              flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              padding:'40px 0',
            }}>
              <Loader2 size={36} color="#0570de"
                style={{
                  animation:'spin 1s linear infinite',
                  marginBottom:'12px',
                }}/>
              <p style={{
                fontSize:'14px',
                color:'var(--text-secondary)',
                margin:0,
              }}>
                Gemini AI is calculating...
              </p>
            </div>
          )}

          {error && (
            <div style={{
              padding:'16px',
              background:'#fee2e2',
              border:'1px solid #fca5a5',
              borderRadius:'8px',
              color:'#991b1b',
              fontSize:'13px',
            }}>
              <AlertTriangle size={14}
                style={{marginRight:'6px',
                  verticalAlign:'middle'}}/>
              {error}
            </div>
          )}

          {result && !loading && (
            <div style={{flex:1}}>
              {/* Score circle */}
              <div style={{
                textAlign:'center',
                marginBottom:'24px',
              }}>
                <div style={{
                  fontSize:'72px', fontWeight:800,
                  color:scoreColor(result.overall_score),
                  lineHeight:1,
                }}>
                  {result.overall_score}
                </div>
                <div style={{
                  fontSize:'13px',
                  color:'var(--text-muted)',
                  marginBottom:'8px',
                }}>
                  out of 100
                </div>
                {result.rating &&
                  RATINGS[result.rating] && (
                  <span style={{
                    display:'inline-block',
                    padding:'4px 14px',
                    borderRadius:'999px',
                    background:
                      RATINGS[result.rating].bg,
                    color:
                      RATINGS[result.rating].color,
                    border:`1px solid ${
                      RATINGS[result.rating].border
                    }`,
                    fontSize:'12px',
                    fontWeight:600,
                  }}>
                    {RATINGS[result.rating].label}
                  </span>
                )}
              </div>

              {/* Component bars */}
              {result.income_stability !== undefined
                && (
                <div style={{marginBottom:'20px'}}>
                  {[
                    ['Income Stability',
                      result.income_stability],
                    ['Growth Trend',
                      result.growth_trend],
                    ['Client Diversification',
                      result.client_concentration],
                  ].filter(([,v]) => v !== undefined)
                   .map(([label, value]) => (
                    <div key={label}
                      style={{marginBottom:'10px'}}>
                      <div style={{
                        display:'flex',
                        justifyContent:'space-between',
                        fontSize:'12px',
                        color:'var(--text-secondary)',
                        marginBottom:'4px',
                      }}>
                        <span>{label}</span>
                        <span style={{fontWeight:600}}>
                          {value}
                        </span>
                      </div>
                      <div style={{
                        height:'6px',
                        background:'var(--bg-page)',
                        borderRadius:'999px',
                        overflow:'hidden',
                      }}>
                        <div style={{
                          height:'100%',
                          width:`${value}%`,
                          background: scoreColor(value),
                          borderRadius:'999px',
                          transition:'width 0.5s ease',
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Key insight */}
              {result.key_insight && (
                <div style={{
                  padding:'12px',
                  background:'var(--bg-page)',
                  borderRadius:'6px',
                  border:'1px solid var(--border-color)',
                  fontSize:'13px',
                  color:'var(--text-secondary)',
                  lineHeight:'1.5',
                  marginBottom:'16px',
                }}>
                  <strong style={{
                    color:'var(--text-primary)',
                    display:'block',
                    marginBottom:'4px',
                  }}>
                    Key factor
                  </strong>
                  {result.key_insight}
                </div>
              )}

              {/* Top recommendation */}
              {result.top_recommendation && (
                <div style={{
                  padding:'12px',
                  background:'#eff6ff',
                  borderRadius:'6px',
                  border:'1px solid #bfdbfe',
                  fontSize:'13px',
                  color:'#1e40af',
                  lineHeight:'1.5',
                }}>
                  <CheckCircle size={13}
                    style={{
                      marginRight:'6px',
                      verticalAlign:'middle',
                    }}/>
                  {result.top_recommendation}
                </div>
              )}

              {/* CTA */}
              <div style={{
                marginTop:'20px',
                padding:'14px',
                background:'var(--bg-page)',
                borderRadius:'8px',
                border:'1px solid var(--border-color)',
                textAlign:'center',
              }}>
                <p style={{
                  fontSize:'13px',
                  color:'var(--text-secondary)',
                  margin:'0 0 10px',
                }}>
                  This is an estimate.
                  Connect real data for a
                  certified report.
                </p>
                <button
                  onClick={() =>
                    window.location.href =
                      '/data-sources'
                  }
                  style={{
                    padding:'8px 16px',
                    background:'#0570de',
                    color:'white', border:'none',
                    borderRadius:'6px',
                    fontSize:'13px', fontWeight:500,
                    cursor:'pointer',
                  }}
                >
                  Connect your data →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
