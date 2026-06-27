import { generateReportPDF } from './src/lib/generateReportPDF';

(async () => {
  try {
    await generateReportPDF({
      id: 1,
      name: 'Q3 Financial Analysis',
      subtitle: 'GPT-4 · Salesforce',
      type: 'Financial',
      status: 'Complete',
      dataSource: 'Salesforce',
      accuracy: 96.1,
      createdAt: 'Oct 15, 2024',
    });
    console.log('SUCCESS!');
  } catch (err) {
    console.error('PDF ERROR:', err);
  }
})();
