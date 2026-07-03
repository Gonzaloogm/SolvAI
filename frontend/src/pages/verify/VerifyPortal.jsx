import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Mail, User, Home, ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function VerifyPortal() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    applicant_email: '',
    requester_name: '',
    requester_company: '',
    requester_email: '',
    property_address: '',
    monthly_rent: ''
  });
  
  const [status, setStatus] = useState('idle'); // idle, submitting, success
  const [requestResult, setRequestResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      const res = await apiClient.post('/verify/request', {
        ...formData,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : undefined
      });
      setRequestResult(res.data);
      setStatus('success');
      addToast('Verification request sent successfully', 'success');
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Failed to send request', 'error');
      setStatus('idle');
    }
  };

  if (status === 'success') {
    const trackUrl = `${window.location.origin}/verify/track/${requestResult.request_id}`;
    return (
      <div 
        className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
        data-force-light="true"
        style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
      >
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-card border border-border rounded-xl text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Request Sent!</h2>
        <p className="text-secondary mb-8">
          We&apos;ve emailed {formData.applicant_email} a secure link to authorize the verification.
          They will not be charged.
        </p>
        
        <div className="bg-page border border-border rounded-lg p-6 mb-8 text-left">
          <p className="text-sm font-medium text-secondary mb-2">Tracking Link</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={trackUrl} 
              className="flex-1 bg-card border border-border rounded-md px-3 text-sm text-primary"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(trackUrl);
                addToast('Tracking link copied', 'success');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2"
            >
              <Copy size={16} /> Copy
            </button>
          </div>
          <p className="text-xs text-muted mt-2">
            Save this link to check the status of your request and download the report when it&apos;s ready.
          </p>
        </div>
        
        <button 
          onClick={() => {
            setFormData({...formData, applicant_email: '', property_address: '', monthly_rent: ''});
            setStatus('idle');
          }}
          className="text-blue-600 font-medium hover:underline"
        >
          Send another request
        </button>
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
    <div className="max-w-3xl mx-auto mt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">SolvAI B2B Verification Portal</h1>
        <p className="text-secondary mt-2">
          Request a verified solvency report directly from applicants. They connect their financial data, and you receive an AI-audited report.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">Your Details (Requester)</h3>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Company / Agency Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
                  <input 
                    type="text" required
                    value={formData.requester_company}
                    onChange={e => setFormData({...formData, requester_company: e.target.value})}
                    className="w-full bg-page border border-border rounded-lg py-2 pl-10 pr-3 text-primary focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Acme Properties"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
                  <input 
                    type="text" required
                    value={formData.requester_name}
                    onChange={e => setFormData({...formData, requester_name: e.target.value})}
                    className="w-full bg-page border border-border rounded-lg py-2 pl-10 pr-3 text-primary focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Your Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
                  <input 
                    type="email" required
                    value={formData.requester_email}
                    onChange={e => setFormData({...formData, requester_email: e.target.value})}
                    className="w-full bg-page border border-border rounded-lg py-2 pl-10 pr-3 text-primary focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="jane@acmeproperties.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">Applicant Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Applicant Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
                  <input 
                    type="email" required
                    value={formData.applicant_email}
                    onChange={e => setFormData({...formData, applicant_email: e.target.value})}
                    className="w-full bg-page border border-border rounded-lg py-2 pl-10 pr-3 text-primary focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="applicant@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Property Address (Optional)</label>
                <div className="relative">
                  <Home className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
                  <input 
                    type="text"
                    value={formData.property_address}
                    onChange={e => setFormData({...formData, property_address: e.target.value})}
                    className="w-full bg-page border border-border rounded-lg py-2 pl-10 pr-3 text-primary focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="123 Main St, Apt 4B"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Monthly Rent / Payment (Optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-muted">€</span>
                  <input 
                    type="number"
                    value={formData.monthly_rent}
                    onChange={e => setFormData({...formData, monthly_rent: e.target.value})}
                    className="w-full bg-page border border-border rounded-lg py-2 pl-8 pr-3 text-primary focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="1500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <button 
              type="submit"
              disabled={status === 'submitting'}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {status === 'submitting' ? 'Sending Request...' : 'Send Verification Request'}
              <ArrowRight size={20} />
            </button>
          </div>
          
        </form>
      </div>
    </div>
    </div>
  );
}
