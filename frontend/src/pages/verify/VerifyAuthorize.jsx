import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Building2, CheckCircle2, Loader2, Lock } from 'lucide-react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function VerifyAuthorize() {
  const { token } = useParams();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [requestDetails, setRequestDetails] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, authorizing, success
  const [stripeKey, setStripeKey] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/verify/authorize/${token}`);
        setRequestDetails(res.data);
      } catch (err) {
        addToast(err?.response?.data?.detail || 'Invalid or expired verification link', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [token, addToast]);

  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (!stripeKey) {
      addToast('Please enter your Stripe API key', 'error');
      return;
    }
    
    setStatus('authorizing');
    try {
      await apiClient.post(`/verify/authorize/${token}`, { stripe_api_key: stripeKey });
      setStatus('success');
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Failed to authorize verification', 'error');
      setStatus('idle');
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
        data-force-light="true"
        style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
      >
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </div>
    );
  }

  if (!requestDetails && !loading) {
    return (
      <div 
        className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
        data-force-light="true"
        style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
      >
      <div className="max-w-xl mx-auto mt-12 p-8 bg-card border border-border rounded-xl text-center">
        <Shield size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-primary mb-2">Invalid Link</h2>
        <p className="text-secondary">This verification link is invalid or has expired.</p>
      </div>
    </div>
    );
  }

  if (status === 'success') {
    return (
      <div 
        className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
        data-force-light="true"
        style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
      >
      <div className="max-w-xl mx-auto mt-12 p-8 bg-card border border-border rounded-xl text-center shadow-sm">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Authorization Complete</h2>
        <p className="text-secondary mb-6">
          Thank you! SolvAI is now generating your verified solvency report and will send it securely to <strong>{requestDetails.requester_company}</strong>.
        </p>
        <div className="bg-page border border-border rounded-lg p-4 text-sm text-secondary">
          You can close this window.
        </div>
      </div>
    </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
      data-force-light="true"
      style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
    >
    <div className="max-w-2xl mx-auto mt-8 mb-24">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Shield size={32} />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">Verification Request</h1>
        <p className="text-secondary">
          <strong>{requestDetails.requester_name}</strong> from <strong>{requestDetails.requester_company}</strong> has requested a verified solvency report to process your application.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="bg-page px-6 py-4 border-b border-border flex items-center gap-3">
          <Building2 className="text-muted" />
          <div>
            <h3 className="font-semibold text-primary">Application Details</h3>
            <p className="text-sm text-muted">
              {requestDetails.property_address || "General Application"} 
              {requestDetails.monthly_rent && ` • €${requestDetails.monthly_rent}/mo`}
            </p>
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 mb-8 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
            <Lock className="shrink-0 mt-0.5" size={18} />
            <p>
              By authorizing, SolvAI will securely analyze your Stripe transactions to generate a high-level income stability report. 
              <strong> {requestDetails.requester_company} will NOT have access to your raw transactions, customers, or bank details.</strong>
            </p>
          </div>

          <form onSubmit={handleAuthorize} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Connect your Stripe Account (Restricted API Key)
              </label>
              <input 
                type="text" required
                value={stripeKey}
                onChange={e => setStripeKey(e.target.value)}
                className="w-full bg-page border border-border rounded-lg py-3 px-4 text-primary focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="rk_test_..."
              />
              <p className="text-xs text-muted mt-2">
                Provide a restricted key with read-only access to &apos;Charges&apos;. This key is never stored by SolvAI after the report is generated.
              </p>
            </div>

            <button 
              type="submit"
              disabled={status === 'authorizing'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {status === 'authorizing' && <Loader2 size={20} className="animate-spin" />}
              {status === 'authorizing' ? 'Authorizing & Generating...' : 'Authorize Verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
