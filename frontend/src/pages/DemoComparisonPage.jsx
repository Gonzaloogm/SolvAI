import React, { useState } from 'react';
import { ArrowLeftRight, GitCompare, Play } from 'lucide-react';

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
  <span className="bg-[#eff6ff] text-[#0570de] px-1 py-0.5 rounded text-xs font-medium">
    {children}
  </span>
);

export default function DemoComparisonPage() {
  const [modelA, setModelA] = useState('GPT-4 Turbo');
  const [modelB, setModelB] = useState('Claude 3.5 Sonnet');
  const [compared, setCompared] = useState(false);

  return (
    <div className="page-enter">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-xl font-semibold text-[#0a2540]">Demo Comparison</h1>
        <p className="text-sm text-[#697386] mt-1">
          Compare AI model explanations side by side
        </p>
      </div>

      {/* MODEL SELECTOR BAR */}
      <div className="bg-white border border-[#e3e8ef] rounded-lg p-5 px-6 mt-6">
        <div className="flex items-end gap-4">
          {/* Model A */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#0a2540]">Model A</label>
            <select
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              className="h-9 border border-[#e3e8ef] rounded-md px-3 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0570de] min-w-[200px]"
            >
              {MODEL_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Arrow Icon */}
          <ArrowLeftRight className="text-[#697386] w-5 h-5 mb-2" />

          {/* Model B */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#0a2540]">Model B</label>
            <select
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              className="h-9 border border-[#e3e8ef] rounded-md px-3 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0570de] min-w-[200px]"
            >
              {MODEL_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Compare Button */}
          <button
            onClick={() => setCompared(true)}
            className="bg-[#0570de] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#0462c7] ml-auto flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Compare
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {!compared && (
        <div className="bg-white border border-[#e3e8ef] rounded-lg p-5 px-6 mt-6 py-16 flex flex-col items-center justify-center">
          <GitCompare className="w-12 h-12 text-[#d0d5dd]" />
          <p className="text-base font-medium text-[#0a2540] mt-4">
            Select models to compare
          </p>
          <p className="text-sm text-[#697386] mt-1 max-w-md text-center">
            Choose two AI models and click Compare to see their explanations side by side
          </p>
        </div>
      )}

      {/* COMPARISON GRID */}
      {compared && (
        <>
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Model A Column */}
            <div className="bg-white border border-[#e3e8ef] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#e3e8ef] flex items-center justify-between">
                <span className="font-semibold text-[#0a2540]">{modelA}</span>
                <span className="bg-[#eff6ff] text-[#0570de] rounded-full px-2.5 py-0.5 text-xs font-medium">
                  v2024.10
                </span>
              </div>

              {/* Input Data */}
              <div className="px-6 pt-5">
                <p className="text-xs font-medium text-[#697386] uppercase tracking-wider mb-2">
                  Input Data
                </p>
                <pre className="bg-[#f6f8fa] rounded-md p-4 font-mono text-xs text-[#425466] leading-relaxed">
                  {INPUT_DATA}
                </pre>
              </div>

              {/* Explanation Output */}
              <div className="px-6 pt-5">
                <p className="text-xs font-medium text-[#697386] uppercase tracking-wider mb-2">
                  Explanation Output
                </p>
                <div className="text-sm text-[#425466] leading-relaxed">
                  The model identifies <Highlight>revenue growth of 12.3%</Highlight> as
                  the primary positive factor. The{' '}
                  <Highlight>debt-to-equity ratio of 0.34</Highlight> falls within
                  acceptable range, though trending upward. Key risk factors include{' '}
                  <Highlight>operating margin compression</Highlight> from increased R&amp;D
                  spending. Overall creditworthiness assessment:{' '}
                  <Highlight>B+ (Stable)</Highlight>.
                </div>
              </div>

              {/* Metrics */}
              <div className="px-6 py-4 border-t border-[#e3e8ef] mt-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#697386]">Accuracy</p>
                    <p className="text-sm font-semibold text-[#0a2540]">94.2%</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#697386]">Confidence</p>
                    <p className="text-sm font-semibold text-[#0a2540]">87.5%</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#697386]">Latency</p>
                    <p className="text-sm font-semibold text-[#0a2540]">1.2s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Model B Column */}
            <div className="bg-white border border-[#e3e8ef] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#e3e8ef] flex items-center justify-between">
                <span className="font-semibold text-[#0a2540]">{modelB}</span>
                <span className="bg-[#eff6ff] text-[#0570de] rounded-full px-2.5 py-0.5 text-xs font-medium">
                  v2024.09
                </span>
              </div>

              {/* Input Data */}
              <div className="px-6 pt-5">
                <p className="text-xs font-medium text-[#697386] uppercase tracking-wider mb-2">
                  Input Data
                </p>
                <pre className="bg-[#f6f8fa] rounded-md p-4 font-mono text-xs text-[#425466] leading-relaxed">
                  {INPUT_DATA}
                </pre>
              </div>

              {/* Explanation Output */}
              <div className="px-6 pt-5">
                <p className="text-xs font-medium text-[#697386] uppercase tracking-wider mb-2">
                  Explanation Output
                </p>
                <div className="text-sm text-[#425466] leading-relaxed">
                  Analysis indicates strong <Highlight>top-line performance</Highlight>{' '}
                  with revenue exceeding sector median by 18%. The{' '}
                  <Highlight>expense-to-revenue ratio of 77.1%</Highlight> suggests
                  operational efficiency concerns. Notable:{' '}
                  <Highlight>debt ratio improvement</Highlight> of 5.2% YoY. The
                  company&apos;s{' '}
                  <Highlight>technology sector positioning</Highlight> provides growth
                  upside. Credit assessment:{' '}
                  <Highlight>B+ (Positive outlook)</Highlight>.
                </div>
              </div>

              {/* Metrics */}
              <div className="px-6 py-4 border-t border-[#e3e8ef] mt-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#697386]">Accuracy</p>
                    <p className="text-sm font-semibold text-[#0a2540]">91.8%</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#697386]">Confidence</p>
                    <p className="text-sm font-semibold text-[#0a2540]">92.1%</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#697386]">Latency</p>
                    <p className="text-sm font-semibold text-[#0a2540]">0.8s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DIFFERENCE HIGHLIGHTS */}
          <div className="bg-white border border-[#e3e8ef] rounded-lg p-5 px-6 mt-6">
            <h2 className="text-base font-semibold text-[#0a2540]">Key Differences</h2>
            <p className="text-sm text-[#425466] mt-1">
              Model A shows 23% higher confidence on risk factors while Model B provides
              more granular sector analysis
            </p>

            <div className="mt-4">
              {/* Diff Item 1 — Blue */}
              <div className="flex items-start gap-3 py-3 border-b border-[#e3e8ef]">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#0570de]" />
                <p className="text-sm text-[#425466]">
                  Model B identifies sector-specific benchmarks (median revenue comparison)
                  that Model A overlooks
                </p>
              </div>

              {/* Diff Item 2 — Green */}
              <div className="flex items-start gap-3 py-3 border-b border-[#e3e8ef]">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#1a9e6e]" />
                <p className="text-sm text-[#425466]">
                  Model A provides explicit risk factor enumeration with operating margin
                  analysis
                </p>
              </div>

              {/* Diff Item 3 — Blue */}
              <div className="flex items-start gap-3 py-3 border-b border-[#e3e8ef]">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#0570de]" />
                <p className="text-sm text-[#425466]">
                  Model B reports faster inference (0.8s vs 1.2s) with comparable accuracy
                </p>
              </div>

              {/* Diff Item 4 — Green */}
              <div className="flex items-start gap-3 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#1a9e6e]" />
                <p className="text-sm text-[#425466]">
                  Model A shows higher overall accuracy (94.2% vs 91.8%) on financial
                  datasets
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1a9e6e]" />
                <span className="text-xs text-[#697386]">Model A insights</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0570de]" />
                <span className="text-xs text-[#697386]">Model B insights</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
