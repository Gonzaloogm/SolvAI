import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { solvencyReports } from '../api/client.js';
import { useToast } from './ToastContext.jsx';

const ReportGenerationContext = createContext(null);

export function ReportGenerationProvider({ children }) {
  const [generatingReports, setGeneratingReports] = useState({}); // { reportId: { status, type } }
  const pollIntervals = useRef({});
  const { addToast } = useToast();

  const startPolling = useCallback((reportId, type) => {
    setGeneratingReports(prev => ({
      ...prev,
      [reportId]: { status: 'PENDING', type }
    }));

    const interval = setInterval(async () => {
      try {
        const res = await solvencyReports.get(reportId);
        const status = res.data.status;
        
        setGeneratingReports(prev => ({
          ...prev,
          [reportId]: { status, type }
        }));

        if (status === 'COMPLETED' || status === 'FAILED') {
          if (status === 'FAILED') {
            addToast(res.data.report_data?.error || 'Report generation failed', 'error');
          }
          clearInterval(pollIntervals.current[reportId]);
          delete pollIntervals.current[reportId];
          
          // Remove from generating list after a moment
          setTimeout(() => {
            setGeneratingReports(prev => {
              const next = { ...prev };
              delete next[reportId];
              return next;
            });
          }, 3000);
          
          // Trigger a global event so any page can refresh its report list
          window.dispatchEvent(new CustomEvent(
            'solvai:report-completed', 
            { detail: { reportId, status } }
          ));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    pollIntervals.current[reportId] = interval;
  }, [addToast]);

  useEffect(() => {
    return () => {
      // Cleanup all intervals on provider unmount (app close, not page navigation)
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
  }, []);

  return (
    <ReportGenerationContext.Provider value={{ generatingReports, startPolling }}>
      {children}
    </ReportGenerationContext.Provider>
  );
}

export const useReportGeneration = () => useContext(ReportGenerationContext);
