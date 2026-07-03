import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div 
      className="min-h-screen bg-[var(--bg-page)] text-primary flex flex-col font-sans"
      data-force-light="true"
      style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
    >
      {/* Navbar */}
      <header className="bg-card border-b border-border py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[760px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--bg-page)] rounded-lg flex items-center justify-center text-[16px] font-extrabold text-primary shadow-sm border border-border">
              S
            </div>
            <div className="text-xl font-bold text-primary tracking-tight">
              SolvAI<span className="text-[var(--brand-blue)]">.</span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/login" className="text-secondary hover:text-primary transition-colors">Sign In</Link>
            <Link to="/register" className="bg-[var(--brand-blue)] text-white px-4 py-1.5 rounded-md hover:bg-[var(--brand-blue-hover)] transition-colors">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-[760px] mx-auto px-6 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl font-bold text-primary mb-2">Terms of Service</h1>
          <p className="text-secondary mb-8 text-sm">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-primary leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">1. Service description</h2>
              <p className="text-secondary">
                SolvAI provides self-serve credit AI and financial reporting tools for freelancers and independent professionals. Our platform aggregates financial data to generate solvency scores and shareable reports.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">2. User responsibilities</h2>
              <p className="text-secondary mb-2">As a user of SolvAI, you agree to:</p>
              <ul className="list-disc pl-5 space-y-1 text-secondary">
                <li>Provide accurate and complete information during registration.</li>
                <li>Maintain the confidentiality of your account credentials.</li>
                <li>Ensure you have the legal right to link and authorize access to any financial data sources you provide.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">3. Acceptable use</h2>
              <p className="text-secondary">
                You may not use SolvAI for any unlawful or prohibited activities. This includes, but is not limited to, attempting to reverse engineer the platform, scraping data, or using the service to misrepresent your financial standing fraudulently.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">4. Payment terms</h2>
              <p className="text-secondary">
                Certain features of SolvAI require a paid subscription or one-time payment. By providing your payment information, you authorize us to charge the applicable fees. All payments are processed securely via Stripe. Fees are non-refundable unless required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">5. Limitation of liability</h2>
              <p className="text-secondary">
                SolvAI provides AI-generated financial insights, which should not be construed as formal financial or legal advice. We are not liable for any direct, indirect, or consequential damages resulting from your use of the service or reliance on the generated reports.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">6. Governing law</h2>
              <p className="text-secondary">
                These Terms of Service are governed by and construed in accordance with the laws of Spain and applicable European Union (EU) regulations. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the courts in Spain.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">7. Contact</h2>
              <p className="text-secondary">
                For any legal inquiries or questions regarding these terms, please contact us at <a href="mailto:legal@solvai.com" className="text-[var(--brand-blue)] hover:underline">legal@solvai.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border mt-auto py-8 text-center text-secondary text-sm">
        <p>&copy; {new Date().getFullYear()} SolvAI. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
