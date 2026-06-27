import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, GitCompare, Play, Download, Share2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const MODEL_OPTIONS = [
 'GPT-4 Turbo',
 'Claude 3.5 Sonnet',
 'Gemini 1.5 Pro',
 'LLaMA 3.1 70B',
 'BERT Fine-tuned',
];

const INPUT_DATA = `{
 "company": "Acme Corp",
 "revenue": 2450000,
 "expenses": 1890000,
 "debt_ratio": 0.34,
 "sector": "Technology"
}`;

const Highlight = ({ children }) => (
 <span className="bg-nav-active text-[#0570de] px-1 py-0.5 rounded text-xs font-medium">
 {children}
 </span>
);

const AnimatedMetric = ({ targetValue, format }) => {
 const [value, setValue] = useState(0);

 useEffect(() => {
 setValue(0);
 const duration = 800;
 const steps = 20;
 const intervalTime = duration / steps;
 const stepValue = targetValue / steps;
 
 let currentStep = 0;
 const timer = setInterval(() => {
 currentStep++;
 if (currentStep >= steps) {
 setValue(targetValue);
 clearInterval(timer);
 } else {
 setValue(currentStep * stepValue);
 }
 }, intervalTime);
 
 return () => clearInterval(timer);
 }, [targetValue]);

 return <span>{format(value)}</span>;
};

const MODEL_DATA = {
 'GPT-4 Turbo': {
 version: 'v2024.10',
 output: (
 <>
 The model identifies <Highlight>revenue growth of 12.3%</Highlight> as
 the primary positive factor. The{' '}
 <Highlight>debt-to-equity ratio of 0.34</Highlight> falls within
 acceptable range, though trending upward. Key risk factors include{' '}
 <Highlight>operating margin compression</Highlight> from increased R&amp;D
 spending. Overall creditworthiness assessment:{' '}
 <Highlight>B+ (Stable)</Highlight>.
 </>
 ),
 metrics: { accuracy: 94.2, confidence: 87.5, latency: 1.2 }
 },
 'Claude 3.5 Sonnet': {
 version: 'v2024.09',
 output: (
 <>
 Analysis indicates strong <Highlight>top-line performance</Highlight>{' '}
 with revenue exceeding sector median by 18%. The{' '}
 <Highlight>expense-to-revenue ratio of 77.1%</Highlight> suggests
 operational efficiency concerns. Notable:{' '}
 <Highlight>debt ratio improvement</Highlight> of 5.2% YoY. The
 company&apos;s{' '}
 <Highlight>technology sector positioning</Highlight> provides growth
 upside. Credit assessment:{' '}
 <Highlight>B+ (Positive outlook)</Highlight>.
 </>
 ),
 metrics: { accuracy: 91.8, confidence: 92.1, latency: 0.8 }
 },
 'Gemini 1.5 Pro': {
 version: 'v2024.08',
 output: (
 <>
 Evaluated metrics highlight a solid <Highlight>technology portfolio</Highlight>{' '}
 with robust <Highlight>R&amp;D investment</Highlight> strategies. However, the{' '}
 <Highlight>debt_ratio of 0.34</Highlight> requires monitoring in the upcoming quarters.
 Overall creditworthiness assessment:{' '}
 <Highlight>A- (Favorable)</Highlight>.
 </>
 ),
 metrics: { accuracy: 93.5, confidence: 89.2, latency: 1.1 }
 },
 'LLaMA 3.1 70B': {
 version: 'v2024.07',
 output: (
 <>
 The financial summary displays a net <Highlight>positive cash flow</Highlight>.
 Revenue stands at 2.45M while expenses are 1.89M. 
 Sector context suggests <Highlight>average risk</Highlight>. Credit rating:{' '}
 <Highlight>B (Moderate)</Highlight>.
 </>
 ),
 metrics: { accuracy: 88.4, confidence: 82.0, latency: 0.6 }
 },
 'BERT Fine-tuned': {
 version: 'v2023.12',
 output: (
 <>
 Classified as <Highlight>Technology sector</Highlight>. 
 Revenue: 2450000. Expenses: 1890000. 
 Calculated profitability: <Highlight>High</Highlight>. 
 Risk profile: <Highlight>Medium</Highlight>.
 </>
 ),
 metrics: { accuracy: 84.1, confidence: 76.5, latency: 0.2 }
 }
};

const getDifferences = (a, b) => {
 if (a === b) {
 return [
 { type: 'A', text: 'Both sides are running the same model, resulting in identical outputs.' }
 ];
 }
 if (a.includes('GPT') && b.includes('Claude')) {
 return [
 { type: 'A', text: 'Model A shows 23% higher confidence on risk factors' },
 { type: 'B', text: 'Model B provides more granular sector analysis' },
 { type: 'B', text: 'Model B identifies sector-specific benchmarks (median revenue comparison) that Model A overlooks' }
 ];
 } else if (a.includes('Gemini') || b.includes('Gemini')) {
 return [
 { type: 'A', text: 'Model A emphasizes technology portfolio strength' },
 { type: 'B', text: 'Model B focuses more on operational efficiency' }
 ];
 } else if (a.includes('LLaMA') || b.includes('LLaMA')) {
 return [
 { type: 'A', text: 'Model A highlights traditional financial metrics' },
 { type: 'B', text: 'Model B exhibits slight instruction-tuning artifacts but good overall reasoning' }
 ];
 }
 return [
 { type: 'A', text: 'Model A provides explicit risk factor enumeration with operating margin analysis' },
 { type: 'B', text: 'Model B reports faster inference with comparable accuracy' }
 ];
};

export default function DemoComparisonPage() {
 const [modelA, setModelA] = useState('GPT-4 Turbo');
 const [modelB, setModelB] = useState('Claude 3.5 Sonnet');
 const [compared, setCompared] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const { addToast } = useToast();

 const handleCompare = () => {
 setCompared(true);
 setIsLoading(true);
 setTimeout(() => {
 setIsLoading(false);
 }, 1500);
 };

 const handleSwap = () => {
 const temp = modelA;
 setModelA(modelB);
 setModelB(temp);
 setCompared(false);
 };

 const handleExport = () => {
 addToast('Comparison exported as PDF', 'success');
 };

 const handleShare = () => {
 addToast('Share link copied to clipboard', 'success');
 };

 const modelDataA = MODEL_DATA[modelA];
 const modelDataB = MODEL_DATA[modelB];

 return (
 <div className="page-enter">
 {/* PAGE HEADER */}
 <div>
 <h1 className="text-xl font-semibold text-primary">Demo Comparison</h1>
 <p className="text-sm text-muted mt-1">
 Compare AI model explanations side by side
 </p>
 </div>

 {/* MODEL SELECTOR BAR */}
 <div className="bg-card border border-border rounded-lg p-5 px-6 mt-6 transition-colors">
 <div className="flex items-end gap-4">
 {/* Model A */}
 <div className="flex flex-col gap-1.5">
 <label className="text-sm font-medium text-primary">Model A</label>
 <select
 value={modelA}
 onChange={(e) => {
 setModelA(e.target.value);
 setCompared(false);
 }}
 className="h-9 border border-border rounded-md px-3 pr-8 text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de] min-w-[200px]"
 >
 {MODEL_OPTIONS.map((model) => (
 <option key={model} value={model}>
 {model}
 </option>
 ))}
 </select>
 </div>

 {/* Swap Button */}
 <button
 onClick={handleSwap}
 className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-0.5"
 title="Swap models"
 >
 <ArrowLeftRight className="text-muted w-5 h-5" />
 </button>

 {/* Model B */}
 <div className="flex flex-col gap-1.5">
 <label className="text-sm font-medium text-primary">Model B</label>
 <select
 value={modelB}
 onChange={(e) => {
 setModelB(e.target.value);
 setCompared(false);
 }}
 className="h-9 border border-border rounded-md px-3 pr-8 text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de] min-w-[200px]"
 >
 {MODEL_OPTIONS.map((model) => (
 <option key={model} value={model}>
 {model}
 </option>
 ))}
 </select>
 </div>

 {/* Action Buttons */}
 <div className="ml-auto flex items-center gap-3">
 <button
 onClick={handleShare}
 className="px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-border dark:hover:border-[#3f3f46]"
 >
 <Share2 className="w-4 h-4" />
 Share
 </button>
 <button
 onClick={handleExport}
 className="px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-border dark:hover:border-[#3f3f46]"
 >
 <Download className="w-4 h-4" />
 Export comparison
 </button>
 <button
 onClick={handleCompare}
 disabled={isLoading}
 className="bg-[#0570de] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#0462c7] disabled:opacity-50 flex items-center gap-2 transition-colors"
 >
 <Play className="w-4 h-4" />
 Compare
 </button>
 </div>
 </div>
 </div>

 {/* EMPTY STATE */}
 {!compared && (
 <div className="bg-card border border-border rounded-lg p-5 px-6 mt-6 py-16 flex flex-col items-center justify-center transition-colors">
 <GitCompare className="w-12 h-12 text-[#d0d5dd] " />
 <p className="text-base font-medium text-primary mt-4">
 Select models to compare
 </p>
 <p className="text-sm text-muted mt-1 max-w-md text-center">
 Choose two AI models and click Compare to see their explanations side by side
 </p>
 </div>
 )}

 {/* COMPARISON GRID */}
 {compared && (
 <>
 <div className="grid grid-cols-2 gap-6 mt-6">
 {/* Model A Column */}
 <div className="bg-card border border-border rounded-lg overflow-hidden transition-colors">
 {/* Header */}
 <div className="px-6 py-4 border-b border-border flex items-center justify-between">
 <span className="font-semibold text-primary">{modelA}</span>
 <span className="bg-nav-active text-[#0570de] rounded-full px-2.5 py-0.5 text-xs font-medium">
 {modelDataA.version}
 </span>
 </div>

 {/* Input Data */}
 <div className="px-6 pt-5">
 <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
 Input Data
 </p>
 <pre className="bg-page rounded-md p-4 font-mono text-xs text-secondary leading-relaxed transition-colors">
 {INPUT_DATA}
 </pre>
 </div>

 {/* Explanation Output */}
 <div className="px-6 pt-5">
 <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
 Explanation Output
 </p>
 <div className="text-sm text-secondary leading-relaxed min-h-[120px]">
 {isLoading ? (
 <div className="animate-pulse space-y-3 mt-2">
 <div className="h-3.5 bg-gray-200 rounded w-full"></div>
 <div className="h-3.5 bg-gray-200 rounded w-11/12"></div>
 <div className="h-3.5 bg-gray-200 rounded w-4/5"></div>
 <div className="h-3.5 bg-gray-200 rounded w-full"></div>
 </div>
 ) : (
 modelDataA.output
 )}
 </div>
 </div>

 {/* Metrics */}
 <div className="px-6 py-4 border-t border-border mt-5">
 <div className="grid grid-cols-3 gap-4">
 <div>
 <p className="text-xs text-muted">Accuracy</p>
 <p className="text-sm font-semibold text-primary">
 {isLoading ? (
 <div className="h-5 bg-gray-200 rounded w-12 mt-0.5 animate-pulse"></div>
 ) : (
 <AnimatedMetric targetValue={modelDataA.metrics.accuracy} format={(v) => `${v.toFixed(1)}%`} />
 )}
 </p>
 </div>
 <div>
 <p className="text-xs text-muted">Confidence</p>
 <p className="text-sm font-semibold text-primary">
 {isLoading ? (
 <div className="h-5 bg-gray-200 rounded w-12 mt-0.5 animate-pulse"></div>
 ) : (
 <AnimatedMetric targetValue={modelDataA.metrics.confidence} format={(v) => `${v.toFixed(1)}%`} />
 )}
 </p>
 </div>
 <div>
 <p className="text-xs text-muted">Latency</p>
 <p className="text-sm font-semibold text-primary">
 {isLoading ? (
 <div className="h-5 bg-gray-200 rounded w-10 mt-0.5 animate-pulse"></div>
 ) : (
 <AnimatedMetric targetValue={modelDataA.metrics.latency} format={(v) => `${v.toFixed(1)}s`} />
 )}
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Model B Column */}
 <div className="bg-card border border-border rounded-lg overflow-hidden transition-colors">
 {/* Header */}
 <div className="px-6 py-4 border-b border-border flex items-center justify-between">
 <span className="font-semibold text-primary">{modelB}</span>
 <span className="bg-nav-active text-[#0570de] rounded-full px-2.5 py-0.5 text-xs font-medium">
 {modelDataB.version}
 </span>
 </div>

 {/* Input Data */}
 <div className="px-6 pt-5">
 <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
 Input Data
 </p>
 <pre className="bg-page rounded-md p-4 font-mono text-xs text-secondary leading-relaxed transition-colors">
 {INPUT_DATA}
 </pre>
 </div>

 {/* Explanation Output */}
 <div className="px-6 pt-5">
 <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
 Explanation Output
 </p>
 <div className="text-sm text-secondary leading-relaxed min-h-[120px]">
 {isLoading ? (
 <div className="animate-pulse space-y-3 mt-2">
 <div className="h-3.5 bg-gray-200 rounded w-full"></div>
 <div className="h-3.5 bg-gray-200 rounded w-11/12"></div>
 <div className="h-3.5 bg-gray-200 rounded w-4/5"></div>
 <div className="h-3.5 bg-gray-200 rounded w-full"></div>
 </div>
 ) : (
 modelDataB.output
 )}
 </div>
 </div>

 {/* Metrics */}
 <div className="px-6 py-4 border-t border-border mt-5">
 <div className="grid grid-cols-3 gap-4">
 <div>
 <p className="text-xs text-muted">Accuracy</p>
 <p className="text-sm font-semibold text-primary">
 {isLoading ? (
 <div className="h-5 bg-gray-200 rounded w-12 mt-0.5 animate-pulse"></div>
 ) : (
 <AnimatedMetric targetValue={modelDataB.metrics.accuracy} format={(v) => `${v.toFixed(1)}%`} />
 )}
 </p>
 </div>
 <div>
 <p className="text-xs text-muted">Confidence</p>
 <p className="text-sm font-semibold text-primary">
 {isLoading ? (
 <div className="h-5 bg-gray-200 rounded w-12 mt-0.5 animate-pulse"></div>
 ) : (
 <AnimatedMetric targetValue={modelDataB.metrics.confidence} format={(v) => `${v.toFixed(1)}%`} />
 )}
 </p>
 </div>
 <div>
 <p className="text-xs text-muted">Latency</p>
 <p className="text-sm font-semibold text-primary">
 {isLoading ? (
 <div className="h-5 bg-gray-200 rounded w-10 mt-0.5 animate-pulse"></div>
 ) : (
 <AnimatedMetric targetValue={modelDataB.metrics.latency} format={(v) => `${v.toFixed(1)}s`} />
 )}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* DIFFERENCE HIGHLIGHTS */}
 {!isLoading && (
 <div className="bg-card border border-border rounded-lg p-5 px-6 mt-6 transition-colors">
 <h2 className="text-base font-semibold text-primary">Key Differences</h2>
 <p className="text-sm text-secondary mt-1">
 A summary of the main differences between the selected models.
 </p>
 
 <div className="mt-4">
 {getDifferences(modelA, modelB).map((diff, i, arr) => (
 <div key={i} className={cn(
 "flex items-start gap-3 py-3", 
 i !== arr.length - 1 ? "border-b border-border" : ""
 )}>
 <div className={cn(
 "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
 diff.type === 'A' ? "bg-[#1a9e6e]" : "bg-[#0570de]"
 )} />
 <p className="text-sm text-secondary">
 {diff.text}
 </p>
 </div>
 ))}
 </div>

 {/* Legend */}
 <div className="mt-4 flex items-center gap-6">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-[#1a9e6e]" />
 <span className="text-xs text-muted">Model A insights</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-[#0570de]" />
 <span className="text-xs text-muted">Model B insights</span>
 </div>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 );
}
