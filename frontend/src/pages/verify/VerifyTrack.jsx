import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function VerifyTrack() {
  const { id } = useParams();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let interval;
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get(`/verify/status/${id}`);
        setStatus(res.data.status);
        if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err) {
        addToast('Failed to fetch request status', 'error');
        clearInterval(interval);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
    interval = setInterval(fetchStatus, 5000);
    
    return () => clearInterval(interval);
  }, [id, addToast]);

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
        data-force-light="true"
        style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch(status) {
      case 'PENDING_APPLICANT': return <Clock className="w-12 h-12 text-yellow-500 mb-4" />;
      case 'GENERATING': return <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />;
      case 'COMPLETED': return <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />;
      case 'FAILED': return <AlertCircle className="w-12 h-12 text-red-500 mb-4" />;
      default: return null;
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'PENDING_APPLICANT': return 'Waiting for Applicant';
      case 'GENERATING': return 'Generating Report...';
      case 'COMPLETED': return 'Report Ready';
      case 'FAILED': return 'Verification Failed';
      default: return 'Unknown Status';
    }
  };

  const getStatusDesc = () => {
    switch(status) {
      case 'PENDING_APPLICANT': return 'The applicant has not yet authorized the verification request.';
      case 'GENERATING': return 'The applicant authorized the request and SolvAI is currently analyzing the data.';
      case 'COMPLETED': return 'The verified report is ready. You should have received it via email.';
      case 'FAILED': return 'There was an issue processing the verification. Please try sending a new request.';
      default: return '';
    }
  };

  return (
    <div 
      className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans py-12"
      data-force-light="true"
      style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
    >
    <div className="max-w-xl mx-auto mt-16 p-8 bg-card border border-border rounded-xl text-center shadow-sm">
      <div className="flex flex-col items-center justify-center">
        {getStatusIcon()}
        <h2 className="text-2xl font-bold text-primary mb-2">{getStatusText()}</h2>
        <p className="text-secondary mb-8">
          {getStatusDesc()}
        </p>
        
        {status === 'COMPLETED' && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-6 mb-8 w-full text-left">
            <h3 className="font-semibold text-green-800 mb-2">Check Your Email</h3>
            <p className="text-sm text-green-700">
              The verified solvency report has been sent securely to your email address. 
              You can also log in to your SolvAI dashboard to view all your requested reports.
            </p>
          </div>
        )}
        
        <div className="flex gap-4">
          <Link 
            to="/verify"
            className="px-6 py-2 border border-border bg-page hover:bg-card text-primary rounded-lg font-medium transition-colors"
          >
            Send New Request
          </Link>
          <Link 
            to="/login"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            Go to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
}
