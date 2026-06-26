import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { IconCheck, IconX, IconLock } from '../components/Icons.jsx';

const PRICING_PLANS = [
  {
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'Perfect for getting started.',
    buttonText: 'Current Plan',
    buttonStyle: 'btn-disabled',
    disabled: true,
    priceId: 'free',
    isPopular: false,
    features: [
      { text: '1 solvency report', included: true },
      { text: 'Basic AI analysis', included: true },
      { text: 'PDF export', included: false, locked: true },
      { text: 'Unlimited reports', included: false, locked: true },
      { text: 'Report history', included: false, locked: true },
    ],
  },
  {
    name: 'Pro',
    price: '€19',
    period: '/month',
    description: 'For independent analysts.',
    buttonText: 'Upgrade to Pro',
    buttonStyle: 'btn-primary',
    disabled: false,
    priceId: 'pro',
    isPopular: true,
    features: [
      { text: 'Unlimited reports', included: true },
      { text: 'Full AI analysis with LangGraph agents', included: true },
      { text: 'PDF export (9-page professional report)', included: true },
      { text: 'Full report history', included: true },
      { text: 'Live orchestration terminal', included: true },
      { text: 'Team access (coming soon)', included: false, locked: false },
    ],
  },
  {
    name: 'Business',
    price: '€49',
    period: '/month',
    description: 'For teams and power users.',
    buttonText: 'Upgrade to Business',
    buttonStyle: 'btn-secondary',
    disabled: false,
    priceId: 'business',
    isPopular: false,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Team access (coming soon)', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access (coming soon)', included: true },
      { text: 'Custom branding (coming soon)', included: true },
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('solvai_token');

  const handleCheckout = async (priceId) => {
    if (!token) {
      navigate('/register', { state: { from: '/pricing' } });
      return;
    }
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/billing/create-checkout-session?price_id=${priceId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert('Error initiating checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="page-layout">
      {token && <Sidebar />}

      <main className="page-content" style={{ padding: 'var(--space-12) var(--space-6)' }}>
        <div className="pricing-container">
          <div className="pricing-header">
            <h1 className="pricing-title">Simple, transparent pricing</h1>
            <p className="pricing-subtitle">Start free. Upgrade when you need more power.</p>
          </div>

          <div className="pricing-cards">
            {PRICING_PLANS.map((plan) => (
              <div 
                key={plan.name} 
                className={`pricing-card ${plan.isPopular ? 'pricing-card--popular' : ''}`}
              >
                {plan.isPopular && (
                  <div className="pricing-card__badge">Most Popular</div>
                )}
                
                <div className="pricing-card__header">
                  <h2 className="pricing-card__name">{plan.name}</h2>
                  <p className="pricing-card__desc">{plan.description}</p>
                </div>
                
                <div className="pricing-card__price-row">
                  <span className="pricing-card__price">{plan.price}</span>
                  <span className="pricing-card__period">{plan.period}</span>
                </div>

                <button
                  className={`pricing-card__btn ${plan.buttonStyle}`}
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={plan.disabled || loading}
                >
                  {loading && !plan.disabled ? <LoadingSpinner size={16} inline /> : plan.buttonText}
                </button>

                <hr className="pricing-card__divider" />

                <ul className="pricing-card__features">
                  {plan.features.map((feature, idx) => (
                    <li 
                      key={idx} 
                      className={`pricing-feature ${!feature.included ? 'pricing-feature--excluded' : ''}`}
                    >
                      <span className="pricing-feature__icon">
                        {feature.included ? (
                          <span style={{ color: 'var(--color-accent-primary)' }}><IconCheck size={16} /></span>
                        ) : feature.locked ? (
                          <span style={{ color: 'var(--color-text-disabled)' }}><IconLock size={14} /></span>
                        ) : (
                          <span style={{ color: 'var(--color-status-error)' }}><IconX size={16} /></span>
                        )}
                      </span>
                      <span className="pricing-feature__text">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pricing-footer">
            <div className="pricing-footer__stripe">
              <svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" width="60" height="25" className="stripe-logo">
                <path fill="currentColor" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5v1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM43.7 20.3c-1.9 0-3.19-.94-3.19-3.17V9.26h-3.2v-3.8h3.2V1.81h4.14v3.66h3.94v3.8h-3.94v6.96c0 .9.39 1.29 1.16 1.29.98 0 1.82-.41 2.76-.85v3.83c-.88.62-2.73 1.12-4.87 1.12zM27.53 20.08a8.3 8.3 0 0 1-4.58-1.12v-3.41c1.1.6 2.45.96 4.14.96 1.62 0 2.4-.41 2.4-1.12 0-.85-1.1-1-2.92-1.42-2.5-.59-4.26-1.54-4.26-4.03 0-2.59 2.08-4.63 6.04-4.63 1.7 0 3.2.43 4.3 1V9.75c-1.03-.54-2.4-.85-3.93-.85-1.48 0-2.19.46-2.19 1.13 0 .76 1.1.92 2.72 1.3 2.8.64 4.45 1.55 4.45 4.14 0 2.87-2.3 4.61-6.17 4.61zM11.66 12.82c0-1.96 1.34-3.27 3.32-3.27 1.95 0 3.03 1.25 3.03 3.06v.21H11.66zm0 1.25h8.04c-.18 1.93-1.6 2.55-3.2 2.55-1.65 0-2.96-.37-4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5v1.48zm-11.66 6.01a8.3 8.3 0 0 1-4.58-1.12v-3.41c1.1.6 2.45.96 4.14.96 1.62 0 2.4-.41 2.4-1.12 0-.85-1.1-1-2.92-1.42-2.5-.59-4.26-1.54-4.26-4.03 0-2.59 2.08-4.63 6.04-4.63 1.7 0 3.2.43 4.3 1V9.75c-1.03-.54-2.4-.85-3.93-.85-1.48 0-2.19.46-2.19 1.13 0 .76 1.1.92 2.72 1.3 2.8.64 4.45 1.55 4.45 4.14 0 2.87-2.3 4.61-6.17 4.61zM36.75 5.46h4.14v14.62h-4.14V5.46zm-5.74 3.8v10.82h-4.14V5.46h4.14v3.8z"/>
              </svg>
              <span>Secured by Stripe</span>
            </div>
            <p className="pricing-footer__text">Cancel anytime. No contracts.</p>
          </div>
        </div>
      </main>

      <style>{`
        .pricing-container {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-10);
          align-items: center;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: var(--space-4);
        }
        .pricing-title {
          font-size: 40px;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: var(--space-3);
          color: var(--color-text-primary);
        }
        .pricing-subtitle {
          font-size: var(--text-lg);
          color: var(--color-text-secondary);
        }

        .pricing-cards {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          width: 100%;
        }
        
        @media (min-width: 900px) {
          .pricing-cards {
            flex-direction: row;
            align-items: stretch;
          }
        }

        .pricing-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .pricing-card--popular {
          background: var(--color-surface-elevated);
          border: 2px solid var(--color-accent-primary);
          transform: scale(1.02);
          box-shadow: 0 10px 40px rgba(0,240,255,0.08);
          z-index: 2;
        }
        
        @media (min-width: 900px) {
          .pricing-card--popular {
            margin: -16px 0;
            padding: calc(var(--space-8) + 16px) var(--space-8);
          }
        }

        .pricing-card__badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-accent-primary);
          color: var(--color-on-primary);
          font-size: var(--text-xs);
          font-weight: 700;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pricing-card__header {
          margin-bottom: var(--space-6);
        }
        .pricing-card__name {
          font-size: var(--text-2xl);
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        .pricing-card__desc {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          min-height: 40px;
        }

        .pricing-card__price-row {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
          margin-bottom: var(--space-6);
        }
        .pricing-card__price {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .pricing-card__period {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .pricing-card__btn {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: var(--text-md);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-disabled {
          background: var(--color-surface-hover);
          color: var(--color-text-disabled);
          cursor: not-allowed;
          border: 1px solid var(--color-border);
        }
        .btn-primary {
          background: var(--color-accent-primary);
          color: var(--color-on-primary);
        }
        .btn-primary:hover {
          filter: brightness(1.1);
        }
        .btn-secondary {
          background: transparent;
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        .btn-secondary:hover {
          background: var(--color-surface-hover);
        }

        .pricing-card__divider {
          margin: var(--space-6) 0;
          border: 0;
          border-top: 1px solid var(--color-border);
        }

        .pricing-card__features {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin: 0;
        }
        .pricing-feature {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          font-size: var(--text-sm);
        }
        .pricing-feature__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .pricing-feature__text {
          color: var(--color-text-primary);
          line-height: 1.4;
        }
        .pricing-feature--excluded .pricing-feature__text {
          color: var(--color-text-disabled);
        }

        .pricing-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-6);
        }
        .pricing-footer__stripe {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
        }
        .stripe-logo {
          color: #635bff;
        }
        .pricing-footer__text {
          font-size: var(--text-sm);
          color: var(--color-text-disabled);
        }
      `}</style>
    </div>
  );
}
