import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { dataSources as dataSourcesApi } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const cn = (...classes) => classes.filter(Boolean).join(' ');
const primaryBtn = 'bg-[var(--brand-blue)] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--brand-blue-hover)] flex items-center gap-2 transition-colors disabled:opacity-60';
const secondaryBtn = 'border border-border text-primary rounded-lg px-3 py-2 text-sm font-medium hover:bg-page transition-colors';

/**
 * First-run guide shown on the dashboard until the user has a completed report:
 * connect a source -> generate a report -> open it.
 */
export default function GettingStarted({ hasSources, hasReport, reportReady, generating, onGenerate, onSourcesChanged }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [connectingDemo, setConnectingDemo] = useState(false);

  useEffect(() => {
    dataSourcesApi.getAvailableIntegrations()
      .then(res => setDemoAvailable(Boolean(res.data?.demo)))
      .catch(() => setDemoAvailable(false));
  }, []);

  const connectDemo = async () => {
    setConnectingDemo(true);
    try {
      const res = await dataSourcesApi.connectDemo();
      addToast(t('dataSources.demo.done'), 'success');
      (res.data?.warnings || []).forEach(w => addToast(w, 'info'));
      await onSourcesChanged();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not connect the demo data', 'error');
    } finally {
      setConnectingDemo(false);
    }
  };

  const steps = [
    {
      title: t('onboarding.step1.title'),
      body: t('onboarding.step1.body'),
      done: hasSources,
      actions: !hasSources && (
        <>
          {demoAvailable && (
            <button onClick={connectDemo} disabled={connectingDemo} className={primaryBtn}>
              {connectingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {connectingDemo ? t('dataSources.demo.connecting') : t('dataSources.demo.button')}
            </button>
          )}
          <button onClick={() => navigate('/data-sources')} className={secondaryBtn}>
            {t('onboarding.step1.own')}
          </button>
        </>
      ),
    },
    {
      title: t('onboarding.step2.title'),
      body: t('onboarding.step2.body'),
      done: hasReport,
      actions: hasSources && !hasReport && (
        <button onClick={onGenerate} disabled={generating} className={primaryBtn}>
          {generating && <Loader2 className="w-4 h-4 animate-spin" />}
          {generating ? t('dashboard.generating') : t('dashboard.generateReport')}
        </button>
      ),
    },
    {
      title: t('onboarding.step3.title'),
      body: t('onboarding.step3.body'),
      done: false,
      actions: reportReady && (
        <button onClick={() => navigate('/reports')} className={primaryBtn}>
          {t('onboarding.step3.open')}
        </button>
      ),
    },
  ];
  const current = steps.findIndex(s => !s.done);

  return (
    <div className="bg-card border border-border rounded-lg p-5 px-6 mt-6">
      <h2 className="text-base font-semibold text-primary">{t('onboarding.title')}</h2>
      <p className="text-sm text-muted mt-1">{t('onboarding.subtitle')}</p>
      <ol className="grid grid-cols-3 gap-4 mt-4">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={cn(
              'rounded-lg border p-4 flex flex-col',
              i === current ? 'border-[var(--brand-blue)]' : 'border-border',
              i > current && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                  step.done ? 'bg-[#1a9e6e] text-white' : i === current ? 'bg-[var(--brand-blue)] text-white' : 'bg-[var(--border-color)] text-muted'
                )}
              >
                {step.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className="text-sm font-semibold text-primary">{step.title}</span>
            </div>
            <p className="text-sm text-muted mt-2 flex-1">{step.body}</p>
            {step.actions && <div className="flex flex-wrap gap-2 mt-3">{step.actions}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
