import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
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
          <h1 className="text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
          <p className="text-secondary mb-8 text-sm">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-primary leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">1. What data we collect</h2>
              <p className="mb-2 text-secondary">We collect information to provide and improve our services to you:</p>
              <ul className="list-disc pl-5 space-y-1 text-secondary">
                <li><strong>Financial transaction data:</strong> securely obtained when you connect external accounts.</li>
                <li><strong>Account info:</strong> name, email, and billing details provided during registration.</li>
                <li><strong>Usage data:</strong> information about how you interact with our platform to help us improve user experience.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">2. How we use your data</h2>
              <p className="mb-2 text-secondary">We use the collected data exclusively to:</p>
              <ul className="list-disc pl-5 space-y-1 text-secondary">
                <li>Generate solvency and financial reports.</li>
                <li>Improve our AI models using aggregated and anonymous data.</li>
                <li>Send transactional and security emails related to your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">3. Data storage and security</h2>
              <p className="text-secondary">
                All data is stored on secure Google Cloud Platform (GCP) servers and is encrypted both at rest and in transit.
                Sensitive data such as Stripe keys are only used once for authorized transactions and are never stored in plain text.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">4. Data sharing</h2>
              <p className="text-secondary">
                We will never sell your data to third parties. We share your data only when explicitly authorized by you (e.g., generating public reports). When sharing via QR code, only your final score and top-level summary are shown to protect your sensitive financial details.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">5. Your rights</h2>
              <p className="text-secondary">
                Under GDPR and applicable laws, you have the right to access, rectify, or delete your personal data. You may exercise these rights at any time through your account settings or by contacting us at <a href="mailto:privacy@solvai.com" className="text-[var(--brand-blue)] hover:underline">privacy@solvai.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">6. Cookies</h2>
              <p className="text-secondary">
                We only use essential cookies that are necessary for authentication and secure session management. We do not use tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">7. Contact</h2>
              <p className="text-secondary">
                If you have any questions or concerns about this Privacy Policy, please contact our Data Protection Officer at <a href="mailto:privacy@solvai.com" className="text-[var(--brand-blue)] hover:underline">privacy@solvai.com</a>.
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
