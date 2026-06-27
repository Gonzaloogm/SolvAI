import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ── Types ─────────────────────────────────────────────────────────────────
interface ReportData {
 id: string;
 name: string;
 type: 'Financial' | 'Risk' | 'Compliance' | 'Custom';
 status: 'Complete' | 'Processing' | 'Failed' | 'Draft';
 createdAt: string;
 dataSource: string;
 model: string;
 overallScore: number;
 rating: 'APPROVE' | 'REVIEW' | 'DECLINE';
 components: {
 incomeStability: { score: number; explanation: string };
 growthTrend: { score: number; explanation: string };
 seasonality: { score: number; explanation: string };
 clientConcentration: { score: number; explanation: string };
 reputationSignals: { score: number; explanation: string };
 };
 financialData: {
 averageMonthlyRevenue: number;
 currency: string;
 platforms: string[];
 monthlyRevenue: Array<{ month: string; transactions: number; revenue: number }>;
 clientConcentration: { totalClients: number; topClientPct: number; top3ClientsPct: number; others: number };
 };
 analytics: {
 avgMoMGrowth: number;
 revenueStdDev: number;
 coefficientOfVariation: number;
 clientHHI: number;
 };
}

// ── Mocks ─────────────────────────────────────────────────────────────────
const generateMockData = (report: any): ReportData => {
 const score = report.accuracy ? parseFloat(report.accuracy) : 79;
 const rating = score >= 80 ? 'APPROVE' : score >= 60 ? 'REVIEW' : 'DECLINE';

 return {
 id: `REP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
 name: report.name || 'SolvAI Assessment',
 type: report.type || 'Financial',
 status: report.status || 'Complete',
 createdAt: report.createdAt || report.created || new Date().toISOString().split('T')[0],
 dataSource: report.dataSource || 'STRIPE',
 model: report.model || 'SolvAI Quant v2.1',
 overallScore: score,
 rating,
 components: {
 incomeStability: { score: 82, explanation: '' },
 growthTrend: { score: 75, explanation: '' },
 seasonality: { score: 68, explanation: '' },
 clientConcentration: { score: 54, explanation: '' },
 reputationSignals: { score: 91, explanation: '' },
 },
 financialData: {
 averageMonthlyRevenue: 45200,
 currency: 'EUR',
 platforms: ['STRIPE', 'PAYPAL'],
 monthlyRevenue: [
 { month: '2023-11', transactions: 120, revenue: 38000 },
 { month: '2023-12', transactions: 145, revenue: 42000 },
 { month: '2024-01', transactions: 110, revenue: 35000 },
 { month: '2024-02', transactions: 130, revenue: 41000 },
 { month: '2024-03', transactions: 155, revenue: 46000 },
 { month: '2024-04', transactions: 160, revenue: 48000 },
 { month: '2024-05', transactions: 175, revenue: 51000 },
 { month: '2024-06', transactions: 150, revenue: 45000 },
 { month: '2024-07', transactions: 165, revenue: 47000 },
 { month: '2024-08', transactions: 180, revenue: 52000 },
 { month: '2024-09', transactions: 195, revenue: 55000 },
 { month: '2024-10', transactions: 190, revenue: 54000 },
 ],
 clientConcentration: {
 totalClients: 142,
 topClientPct: 24.5,
 top3ClientsPct: 41.2,
 others: 58.8
 }
 },
 analytics: {
 avgMoMGrowth: 4.2,
 revenueStdDev: 6200,
 coefficientOfVariation: 13.7,
 clientHHI: 1250,
 }
 };
};

const mockAIAnalysis = async (data: ReportData) => {
 await new Promise(r => setTimeout(r, 1500)); // Simulate AI delay
 return {
 executiveSummary: "Based on the comprehensive algorithmic analysis of the verified data sources, the entity demonstrates a robust financial standing with consistent revenue generation. The overall health metric reflects strong operational consistency, albeit with minor areas warranting ongoing monitoring. The entity has maintained a steady operational pace over the past 12 months, showing resilience against market fluctuations.\n\nRevenue stability is notably strong, with average monthly inflows significantly outperforming sector medians. While some seasonal variance is detected, it remains well within acceptable thresholds and does not pose a systemic risk to solvency. The operational margins indicate efficient capital utilization and a sustainable business model.\n\nClient concentration shows moderate dependency on a few key accounts, which is standard for this growth phase but represents a structural vulnerability. Overall, the positive momentum in growth and excellent reputation signals strongly support a favorable assessment.",
 industryContext: "In the context of the broader industry landscape, the entity's performance is situated in the upper quartile for stability and growth. Macro-economic headwinds have generally compressed margins across this sector, yet this entity has successfully navigated these challenges by maintaining pricing power and optimizing operational costs. The digital-first nature of their revenue streams provides a structural advantage compared to legacy competitors.",
 componentExplanations: {
 incomeStability: "Income streams are highly predictable with minimal erratic fluctuations. The 3-month moving average shows a steady upward trajectory.",
 growthTrend: "Month-over-month growth averages 4.2%, outpacing the industry standard of 2.1%. The growth is organic and sustained.",
 seasonality: "Historical data indicates a slight dip in Q1, which is offset by strong Q3/Q4 performance. The variance is predictable and manageable.",
 clientConcentration: "The top client accounts for 24.5% of revenue. While not critical, losing this client would cause short-term cash flow strain.",
 reputationSignals: "No negative flags found across verified platforms. Chargeback rates are exceptionally low at <0.1%."
 },
 lenderImplications: {
 incomeStability: "Highly reliable for regular debt servicing. Low risk of missed payments due to cash shortages.",
 growthTrend: "Positive indicator for long-term viability and potential for upselling additional financial products.",
 seasonality: "May require flexible repayment structures or short-term credit facilities during Q1 troughs.",
 clientConcentration: "Monitor the financial health of the top 3 clients, as they represent a significant portion of incoming cash.",
 reputationSignals: "Strong indicator of operational excellence and low fraud risk."
 },
 riskFlags: [
 "Top client dependency exceeds the 20% optimal threshold (currently 24.5%).",
 "Q1 seasonal revenue dip requires adequate cash reserves in Q4.",
 "Slight increase in operational volatility observed in Month 8."
 ],
 recommendations: [
 {
 title: "Diversify Client Base",
 steps: [
 "Step 1: Increase marketing spend targeting mid-market clients to reduce reliance on the top account.",
 "Step 2: Implement volume caps or tiered pricing to incentivize smaller clients."
 ]
 },
 {
 title: "Establish Seasonal Cash Buffer",
 steps: [
 "Step 1: Allocate 15% of Q4 profits to a dedicated reserve account.",
 "Step 2: Secure a flexible credit line to smooth operations during the Q1 dip."
 ]
 }
 ],
 analyticalObservations: [
 "Revenue Coefficient of Variation (CoV) is 13.7%, indicating very low volatility.",
 "The estimated Client Herfindahl-Hirschman Index (HHI) of 1250 suggests a moderately competitive, un-concentrated market position.",
 "Growth momentum indicator has remained positive for 9 of the last 12 months."
 ]
 };
};

// ── Chart Generators ──────────────────────────────────────────────────────
async function createRadarChart(scores: any): Promise<string> {
 const canvas = document.createElement('canvas');
 canvas.width = 400; canvas.height = 400;
 canvas.style.position = 'absolute';
 canvas.style.left = '-9999px';
 document.body.appendChild(canvas);
 const ctx = canvas.getContext('2d')!;
 
 const chart = new Chart(ctx, {
 type: 'radar',
 data: {
 labels: ['Income Stability', 'Growth Trend', 'Seasonality', 'Client Diversification', 'Reputation'],
 datasets: [{
 data: [
 scores.incomeStability.score,
 scores.growthTrend.score,
 scores.seasonality.score,
 scores.clientConcentration.score,
 scores.reputationSignals.score
 ],
 backgroundColor: 'rgba(26, 158, 117, 0.3)',
 borderColor: '#1a9e75',
 borderWidth: 2,
 pointBackgroundColor: '#1a9e75',
 }]
 },
 options: {
 responsive: false,
 maintainAspectRatio: false,
 animation: false,
 scales: {
 r: {
 min: 0, max: 100,
 ticks: { stepSize: 25 },
 grid: { color: '#e3e8ef' },
 }
 },
 plugins: { legend: { display: false } }
 }
 });
 
 await new Promise(r => setTimeout(r, 50));
 const imageData = canvas.toDataURL('image/png');
 chart.destroy();
 document.body.removeChild(canvas);
 return imageData;
}

async function createBarChart(monthlyData: any[]): Promise<string> {
 const canvas = document.createElement('canvas');
 canvas.width = 600; canvas.height = 300;
 canvas.style.position = 'absolute';
 canvas.style.left = '-9999px';
 document.body.appendChild(canvas);
 const ctx = canvas.getContext('2d')!;
 
 const movingAvg = monthlyData.map((_, i) => {
 if (i < 2) return null;
 return (monthlyData[i].revenue + monthlyData[i-1].revenue + monthlyData[i-2].revenue) / 3;
 });
 
 const chart = new Chart(ctx, {
 type: 'bar',
 data: {
 labels: monthlyData.map(d => d.month),
 datasets: [
 {
 label: 'Revenue',
 data: monthlyData.map(d => d.revenue),
 backgroundColor: 'rgba(130, 145, 210, 0.7)',
 borderColor: 'rgba(130, 145, 210, 1)',
 borderWidth: 1,
 },
 {
 label: '3-Mo Moving Avg',
 data: movingAvg,
 type: 'line',
 borderColor: '#f59e0b',
 backgroundColor: '#f59e0b',
 borderWidth: 2,
 pointRadius: 4,
 tension: 0.3,
 }
 ]
 },
 options: {
 responsive: false,
 maintainAspectRatio: false,
 animation: false,
 plugins: { legend: { position: 'top', align: 'end' } },
 scales: {
 y: { 
 beginAtZero: true,
 ticks: { callback: (v) => `€${Number(v).toLocaleString()}` }
 }
 }
 }
 });
 
 await new Promise(r => setTimeout(r, 50));
 const imageData = canvas.toDataURL('image/png');
 chart.destroy();
 document.body.removeChild(canvas);
 return imageData;
}

async function createPieChart(data: any): Promise<string> {
 const canvas = document.createElement('canvas');
 canvas.width = 350; canvas.height = 350;
 canvas.style.position = 'absolute';
 canvas.style.left = '-9999px';
 document.body.appendChild(canvas);
 const ctx = canvas.getContext('2d')!;
 
 const chart = new Chart(ctx, {
 type: 'pie',
 data: {
 labels: ['Top Client', 'Clients 2-3', 'Other Clients'],
 datasets: [{
 data: [data.topClientPct, data.top3ClientsPct - data.topClientPct, data.others],
 backgroundColor: ['#3b82f6', '#f59e0b', '#22c55e'],
 borderWidth: 2,
 borderColor: '#ffffff',
 }]
 },
 options: {
 responsive: false,
 maintainAspectRatio: false,
 animation: false,
 plugins: {
 legend: { position: 'right' }
 }
 }
 });
 
 await new Promise(r => setTimeout(r, 50));
 const imageData = canvas.toDataURL('image/png');
 chart.destroy();
 document.body.removeChild(canvas);
 return imageData;
}

// ── PDF Generator ─────────────────────────────────────────────────────────
export const generateReportPDF = async (reportItem: any) => {
 const data = generateMockData(reportItem);
 const ai = await mockAIAnalysis(data);
 
 const radarImg = await createRadarChart(data.components);
 const barImg = await createBarChart(data.financialData.monthlyRevenue);
 const pieImg = await createPieChart(data.financialData.clientConcentration);

 const doc = new jsPDF();
 const pageWidth = doc.internal.pageSize.getWidth();
 const pageHeight = doc.internal.pageSize.getHeight();
 const margin = 20;

 const addFooter = (doc: jsPDF, pageNum: number, total: number) => {
 doc.setFontSize(9);
 doc.setTextColor(105, 115, 134); // #697386
 doc.text(`SolvAI Confidential | Page ${pageNum} of ${total}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
 };

 const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
 doc.setFillColor(26, 158, 117); // #1a9e75
 doc.rect(margin, y - 4, 3, 14, 'F');
 doc.setFontSize(16);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64); // #0a2540
 doc.text(title, margin + 8, y + 6);
 return y + 20;
 };

 const addBodyText = (doc: jsPDF, text: string, y: number) => {
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102); // #425466
 const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
 doc.text(lines, margin, y);
 return y + (lines.length * 5) + 5;
 };

 const addLenderImplications = (doc: jsPDF, text: string, y: number) => {
 const lines = doc.splitTextToSize(`Lender Implications: ${text}`, pageWidth - margin * 2 - 16);
 const height = (lines.length * 5) + 12;
 
 doc.setFillColor(232, 244, 253); // #e8f4fd
 doc.rect(margin, y, pageWidth - margin * 2, height, 'F');
 doc.setFillColor(5, 112, 222); // #0570de
 doc.rect(margin, y, 3, height, 'F');
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(5, 112, 222);
 doc.text('Lender Implications:', margin + 8, y + 8);
 
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 const implicationText = doc.splitTextToSize(text, pageWidth - margin * 2 - 45);
 doc.text(implicationText, margin + 40, y + 8);
 
 return y + height + 10;
 };

 // ── PAGE 1: COVER ───────────────────────────────────────────────────────
 doc.setFontSize(24);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(5, 112, 222);
 doc.text('SolvAI', margin, 40);
 
 doc.setFontSize(14);
 doc.setTextColor(10, 37, 64);
 doc.text('Financial Assessment Report', margin, 50);
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 doc.text(`Report ID: ${data.id}`, margin, 70);
 doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 78);
 doc.text(`Data Source: ${data.dataSource}`, margin, 86);
 doc.text(`Model: ${data.model}`, margin, 94);

 // Confidential box
 doc.setDrawColor(223, 27, 65);
 doc.setLineWidth(1);
 doc.rect(margin, 120, pageWidth - margin * 2, 40);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(223, 27, 65);
 doc.text('STRICTLY CONFIDENTIAL', margin + 5, 130);
 doc.setFont('helvetica', 'normal');
 doc.text('This document contains proprietary analysis generated by SolvAI.', margin + 5, 140);
 doc.text('Do not distribute without authorization.', margin + 5, 150);

 // Score
 const scoreColor = data.overallScore >= 70 ? [26, 158, 117] : data.overallScore >= 50 ? [201, 135, 12] : [223, 27, 65];
 doc.setFontSize(60);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
 doc.text(data.overallScore.toString(), pageWidth / 2, 220, { align: 'center' });
 doc.setFontSize(14);
 doc.setTextColor(105, 115, 134);
 doc.text('OVERALL SCORE', pageWidth / 2, 230, { align: 'center' });
 
 addFooter(doc, 1, 9);

 // ── PAGE 2: EXECUTIVE SUMMARY ───────────────────────────────────────────
 doc.addPage();
 let y = 30;
 y = addSectionTitle(doc, '1. Executive Summary', y);
 
 // Rating Badge
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 if (data.rating === 'APPROVE') {
 doc.setFillColor(26, 158, 117); doc.setTextColor(255, 255, 255);
 } else if (data.rating === 'REVIEW') {
 doc.setFillColor(201, 135, 12); doc.setTextColor(10, 37, 64);
 } else {
 doc.setFillColor(223, 27, 65); doc.setTextColor(255, 255, 255);
 }
 doc.rect(margin, y, 40, 10, 'F');
 doc.text(data.rating, margin + 20, y + 7, { align: 'center' });
 y += 20;

 y = addBodyText(doc, ai.executiveSummary, y);
 addFooter(doc, 2, 9);

 // ── PAGE 3: INDUSTRY CONTEXT ────────────────────────────────────────────
 doc.addPage();
 y = 30;
 y = addSectionTitle(doc, 'Industry Context & Macro Comparison', y);
 y = addBodyText(doc, ai.industryContext, y);
 addFooter(doc, 3, 9);

 // ── PAGE 4: COMPONENT ANALYSIS ──────────────────────────────────────────
 doc.addPage();
 y = 30;
 y = addSectionTitle(doc, '2. Component Analysis', y);
 
 doc.addImage(radarImg, 'PNG', pageWidth / 2 - 75, y, 150, 150);
 y += 160;

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`Income Stability: ${data.components.incomeStability.score}/100`, margin, y);
 y += 8;
 y = addBodyText(doc, ai.componentExplanations.incomeStability, y);
 y = addLenderImplications(doc, ai.lenderImplications.incomeStability, y);

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`Growth Trend: ${data.components.growthTrend.score}/100`, margin, y);
 y += 8;
 y = addBodyText(doc, ai.componentExplanations.growthTrend, y);
 y = addLenderImplications(doc, ai.lenderImplications.growthTrend, y);

 addFooter(doc, 4, 9);

 // ── PAGE 5: COMPONENT ANALYSIS CONT. ────────────────────────────────────
 doc.addPage();
 y = 30;
 
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`Seasonality: ${data.components.seasonality.score}/100`, margin, y);
 y += 8;
 y = addBodyText(doc, ai.componentExplanations.seasonality, y);
 y = addLenderImplications(doc, ai.lenderImplications.seasonality, y);

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`Client Diversification: ${data.components.clientConcentration.score}/100`, margin, y);
 y += 8;
 y = addBodyText(doc, ai.componentExplanations.clientConcentration, y);
 y = addLenderImplications(doc, ai.lenderImplications.clientConcentration, y);

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`Reputation Signals: ${data.components.reputationSignals.score}/100`, margin, y);
 y += 8;
 y = addBodyText(doc, ai.componentExplanations.reputationSignals, y);
 y = addLenderImplications(doc, ai.lenderImplications.reputationSignals, y);

 y += 10;
 y = addSectionTitle(doc, '3. Risk Flags', y);
 ai.riskFlags.forEach(flag => {
 doc.setFillColor(223, 27, 65);
 doc.circle(margin + 2, y + -1, 1.5, 'F');
 const lines = doc.splitTextToSize(flag, pageWidth - margin * 2 - 10);
 doc.text(lines, margin + 8, y);
 y += (lines.length * 5) + 2;
 });

 addFooter(doc, 5, 9);

 // ── PAGE 6: RECOMMENDATIONS ─────────────────────────────────────────────
 doc.addPage();
 y = 30;
 y = addSectionTitle(doc, '4. Recommendations', y);

 ai.recommendations.forEach((rec, idx) => {
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`${idx + 1}. ${rec.title}`, margin, y);
 y += 8;

 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 rec.steps.forEach(step => {
 const lines = doc.splitTextToSize(step, pageWidth - margin * 2 - 10);
 doc.text(lines, margin + 8, y);
 y += (lines.length * 5) + 2;
 });
 y += 10;
 });

 addFooter(doc, 6, 9);

 // ── PAGE 7: FINANCIAL DATA ──────────────────────────────────────────────
 doc.addPage();
 y = 30;
 y = addSectionTitle(doc, '5. Financial Data & Evidence', y);
 
 doc.setFontSize(10);
 doc.setTextColor(66, 84, 102);
 doc.text(`Analysis based on verified platforms (${data.financialData.platforms.join(', ')}), spanning 12 months.`, margin, y);
 y += 15;

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('Average Monthly Revenue', margin, y);
 y += 10;
 doc.setFontSize(28);
 doc.setTextColor(26, 158, 117);
 doc.text(`€${data.financialData.averageMonthlyRevenue.toLocaleString()}`, margin, y);
 y += 20;

 doc.setFontSize(12);
 doc.setTextColor(10, 37, 64);
 doc.text('Historical Revenue Trend', margin, y);
 y += 10;
 doc.addImage(barImg, 'PNG', margin, y, 160, 80);
 y += 90;

 autoTable(doc, {
 startY: y,
 head: [['Month', 'Transactions', 'Total Revenue (EUR)']],
 body: data.financialData.monthlyRevenue.map(d => [d.month, d.transactions, `€${d.revenue.toLocaleString()}`]),
 styles: { fontSize: 9, cellPadding: 4 },
 headStyles: { fillColor: [246, 248, 250], textColor: [10, 37, 64], fontStyle: 'bold' },
 alternateRowStyles: { fillColor: [250, 250, 250] },
 margin: { left: margin }
 });

 addFooter(doc, 7, 9);

 // ── PAGE 8: CLIENT CONCENTRATION ────────────────────────────────────────
 doc.addPage();
 y = 30;
 y = addSectionTitle(doc, 'Client Concentration Profile', y);
 
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text(`Total Distinct Clients: ${data.financialData.clientConcentration.totalClients}`, margin, y);
 y += 20;

 doc.text('Revenue Dependency', margin, y);
 y += 10;
 doc.addImage(pieImg, 'PNG', margin, y, 100, 100);
 y += 120;

 const drawProgressBar = (label: string, pct: number, yPos: number) => {
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 doc.text(`${label}: ${pct.toFixed(1)}%`, margin, yPos);
 
 doc.setFillColor(227, 232, 239);
 doc.rect(margin, yPos + 3, pageWidth - margin * 2, 4, 'F');
 
 doc.setFillColor(5, 112, 222);
 doc.rect(margin, yPos + 3, ((pageWidth - margin * 2) * pct) / 100, 4, 'F');
 };

 drawProgressBar('Top Client Contribution', data.financialData.clientConcentration.topClientPct, y);
 drawProgressBar('Top 3 Clients Contribution', data.financialData.clientConcentration.top3ClientsPct, y + 20);

 addFooter(doc, 8, 9);

 // ── PAGE 9: ADVANCED ANALYTICS ──────────────────────────────────────────
 doc.addPage();
 y = 30;
 y = addSectionTitle(doc, '6. Advanced Analytics & Volatility Insights', y);
 
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 doc.text('Deep mathematical modeling generated by SolvAI Quantitative Engine:', margin, y);
 y += 15;

 const metrics = [
 { label: 'Average MoM Growth:', value: `${data.analytics.avgMoMGrowth}%` },
 { label: 'Revenue Volatility (StDev):', value: `€${data.analytics.revenueStdDev.toLocaleString()}` },
 { label: 'Coefficient of Variation (CoV):', value: `${data.analytics.coefficientOfVariation}%` },
 { label: 'Estimated Client HHI (Risk Index):', value: `${data.analytics.clientHHI}/10000` },
 ];

 metrics.forEach(m => {
 doc.setFont('helvetica', 'bold');
 doc.text(m.label, margin, y);
 doc.setFont('helvetica', 'normal');
 doc.text(m.value, margin + 70, y);
 y += 8;
 });

 y += 10;
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text('Algorithmic Observations', margin, y);
 y += 10;

 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 ai.analyticalObservations.forEach(obs => {
 doc.setFillColor(5, 112, 222);
 doc.circle(margin + 2, y + -1, 1.5, 'F');
 const lines = doc.splitTextToSize(obs, pageWidth - margin * 2 - 10);
 doc.text(lines, margin + 8, y);
 y += (lines.length * 5) + 2;
 });

 y += 20;
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(10, 37, 64);
 doc.text('Appendix: Data References', margin, y);
 y += 10;
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(66, 84, 102);
 doc.text(`Connected Platforms: ${data.financialData.platforms.join(', ')}`, margin, y);

 addFooter(doc, 9, 9);

 // ── SAVE ─────────────────────────────────────────────────────────────────
 doc.save(`SolvAI_Report_${data.id}.pdf`);
};
