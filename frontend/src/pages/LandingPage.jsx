import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, CheckCircle2, Shield, Zap, Database, BarChart, Users, ArrowUpRight, Search } from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Landing page always uses light theme regardless of user's dark mode preference
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
    return () => {
      // Restore user's theme when leaving landing page
      if (wasDark) {
        html.classList.add('dark');
        html.setAttribute('data-theme', 'dark');
      }
    };
  }, []);

  const navigation = [
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'For Lenders', href: '#lenders' },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a2540] font-sans selection:bg-[#0570de] selection:text-white overflow-x-hidden">
      
      {/* SECTION 1: Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#ffffff]/80 backdrop-blur-md border-b border-[#e3e8ef]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <img src="/SolvAI-logo.png" alt="SolvAI Logo" className="h-8 w-auto" />
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-[#0a2540]/80 hover:text-[#0570de] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-[#0a2540] hover:text-[#0570de] text-sm font-medium transition-colors">
                Sign in
              </Link>
              <Link
                to="/register"
                className="bg-[#0570de] text-white hover:bg-[#045cba] px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                Get started
              </Link>
            </div>
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-[#0a2540] hover:bg-[#f6f8fa] focus:outline-none"
              >
                {mobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#ffffff] border-b border-[#e3e8ef]">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-[#0a2540] hover:bg-[#f6f8fa] hover:text-[#0570de]"
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="block w-full text-center px-4 py-2 border border-[#e3e8ef] text-[#0a2540] rounded-md text-base font-medium"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-4 py-2 bg-[#0570de] text-white rounded-md text-base font-medium"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* SECTION 2: Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f6f8fa] border border-[#e3e8ef] text-sm font-medium text-[#0570de] mb-8">
          <span className="flex h-2 w-2 rounded-full bg-[#0570de]"></span>
          Built on your Stripe and PayPal data
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
          Bank-grade credit <span className="text-[#0570de]">explainability</span> for freelancers
        </h1>
        <p className="text-lg md:text-xl text-[#0a2540]/70 max-w-2xl mx-auto mb-10">
          Connect the accounts you already get paid through and get the solvency report a lender would build: every score explained, every figure traced back to real transactions.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 bg-[#0570de] text-white hover:bg-[#045cba] px-6 py-3 rounded-lg text-base font-medium transition-colors shadow-sm"
          >
            Get your free report <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center justify-center gap-2 bg-white border border-[#e3e8ef] text-[#0a2540] hover:bg-[#f6f8fa] px-6 py-3 rounded-lg text-base font-medium transition-colors"
          >
            How it works
          </a>
        </div>
        
        {/* Hero Visual Mockup */}
        <div className="relative mx-auto w-full max-w-5xl rounded-xl border border-[#e3e8ef] bg-white shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
          <div className="absolute top-0 w-full h-12 bg-[#f6f8fa] border-b border-[#e3e8ef] flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <div className="mx-auto w-1/3 h-6 bg-white rounded-md border border-[#e3e8ef] flex items-center justify-center text-xs text-[#0a2540]/50">
              <Search className="w-3 h-3 mr-2" /> app.solvai.com
            </div>
          </div>
          <div className="pt-12 p-6 flex h-full">
            <div className="w-1/4 border-r border-[#e3e8ef] pr-6 hidden md:block">
              <div className="space-y-4">
                <div className="h-4 bg-[#f6f8fa] rounded w-3/4"></div>
                <div className="h-4 bg-[#f6f8fa] rounded w-1/2"></div>
                <div className="h-4 bg-[#f6f8fa] rounded w-5/6"></div>
              </div>
            </div>
            <div className="flex-1 pl-0 md:pl-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <div className="h-8 bg-[#f6f8fa] rounded w-48 mb-2"></div>
                  <div className="h-4 bg-[#f6f8fa] rounded w-32"></div>
                </div>
                <div className="h-10 bg-[#0570de]/10 rounded w-24"></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="h-24 bg-[#f6f8fa] rounded-lg border border-[#e3e8ef]"></div>
                <div className="h-24 bg-[#f6f8fa] rounded-lg border border-[#e3e8ef]"></div>
                <div className="h-24 bg-[#f6f8fa] rounded-lg border border-[#e3e8ef]"></div>
              </div>
              <div className="h-40 bg-[#f6f8fa] rounded-lg border border-[#e3e8ef]"></div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Logos */}
      <section className="py-10 border-y border-[#e3e8ef] bg-[#f6f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-[#0a2540]/60 mb-6 uppercase tracking-wider">Works with the platforms freelancers already get paid through</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60">
            <div className="text-xl font-bold text-[#635bff]">Stripe</div>
            <div className="text-xl font-bold italic text-[#003087]">PayPal</div>
            <div className="text-xl font-bold">Bank statements (CSV)</div>
            <div className="text-xl font-bold">Google Gemini</div>
          </div>
        </div>
      </section>

      {/* SECTION 4: How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How SolvAI Works</h2>
            <p className="text-lg text-[#0a2540]/70 max-w-2xl mx-auto">Three simple steps to verify users and analyze their financial health automatically.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center relative">
              <div className="w-16 h-16 mx-auto bg-[#0570de]/10 text-[#0570de] rounded-2xl flex items-center justify-center mb-6 z-10 relative">
                <span className="text-2xl font-bold">1</span>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-[2px] bg-gradient-to-r from-[#0570de]/20 to-transparent"></div>
              <h3 className="text-xl font-bold mb-3">Connect Accounts</h3>
              <p className="text-[#0a2540]/70">Users securely link their bank accounts through our branded or white-label portal.</p>
            </div>
            <div className="text-center relative">
              <div className="w-16 h-16 mx-auto bg-[#0570de]/10 text-[#0570de] rounded-2xl flex items-center justify-center mb-6 z-10 relative">
                <span className="text-2xl font-bold">2</span>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-[2px] bg-gradient-to-r from-[#0570de]/20 to-transparent"></div>
              <h3 className="text-xl font-bold mb-3">AI Analysis</h3>
              <p className="text-[#0a2540]/70">Our engine categorizes transactions, verifies income, and identifies spending patterns.</p>
            </div>
            <div className="text-center relative">
              <div className="w-16 h-16 mx-auto bg-[#0570de]/10 text-[#0570de] rounded-2xl flex items-center justify-center mb-6 z-10 relative">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Get Insights</h3>
              <p className="text-[#0a2540]/70">Receive a comprehensive PDF or JSON report with risk scores and verified data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Product Features */}
      <section id="features" className="py-24 bg-[#f6f8fa] border-y border-[#e3e8ef]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to underwrite</h2>
            <p className="text-lg text-[#0a2540]/70 max-w-2xl mx-auto">Powerful features designed to automate manual reviews and reduce fraud.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Database, title: 'Real Payment Data', desc: 'Connect Stripe or PayPal, or upload a bank statement. No manual forms.' },
              { icon: Zap, title: 'Instant Verification', desc: 'Verify identity, account ownership, and balances in seconds.' },
              { icon: BarChart, title: 'Income Insights', desc: 'Identify multiple income streams, gig work, and frequency.' },
              { icon: Shield, title: 'Fraud Detection', desc: 'Detect anomalies and altered bank statements automatically.' },
              { icon: Users, title: 'White-label Portal', desc: 'Embed the verification flow directly in your application.' },
              { icon: CheckCircle2, title: 'PDF & API Exports', desc: 'Get clean PDF reports for manual review or API data for automated decisions.' },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-[#e3e8ef] hover:shadow-lg transition-shadow">
                <feature.icon className="w-10 h-10 text-[#0570de] mb-4" />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[#0a2540]/70">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: For Lenders & Landlords */}
      <section id="lenders" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0570de]/10 text-sm font-medium text-[#0570de] mb-6">
              Use Case
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Built for modern lenders and property managers</h2>
            <p className="text-lg text-[#0a2540]/70 mb-8">
              Stop waiting days for bank statements and manual reviews. Send a verification link and get a full financial profile in minutes. Perfect for personal loans, auto financing, and tenant screening.
            </p>
            <ul className="space-y-4 mb-8 text-left max-w-md mx-auto lg:mx-0">
              {['Income verified against real transactions', 'Every factor cites the payments behind it', 'Verifiable PDF with a QR code'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="inline-flex items-center gap-2 text-[#0570de] font-bold hover:underline">
              See how it helps your business <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0570de]/20 to-transparent rounded-3xl transform rotate-3 scale-105"></div>
            <div className="relative bg-white border border-[#e3e8ef] rounded-2xl shadow-xl p-8 max-w-sm mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="font-bold text-lg">Verify your income</h3>
                <p className="text-sm text-gray-500">Securely connect your bank</p>
              </div>
              <div className="space-y-3">
                <button className="w-full bg-[#f6f8fa] border border-[#e3e8ef] p-3 rounded-lg flex items-center justify-between hover:border-[#0570de] transition-colors">
                  <span className="font-medium">Chase Bank</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full bg-[#f6f8fa] border border-[#e3e8ef] p-3 rounded-lg flex items-center justify-between hover:border-[#0570de] transition-colors">
                  <span className="font-medium">Bank of America</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full bg-[#f6f8fa] border border-[#e3e8ef] p-3 rounded-lg flex items-center justify-between hover:border-[#0570de] transition-colors">
                  <span className="font-medium">Wells Fargo</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="mt-6 pt-6 border-t border-[#e3e8ef] text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secured by SolvAI
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Pricing */}
      <section id="pricing" className="py-24 bg-[#0a2540] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">Start for free. Pay by card or with PayPal when you need the full report.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 flex flex-col">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="text-3xl font-bold mb-6">€0<span className="text-lg font-normal text-white/60">/month</span></div>
              <p className="text-white/70 mb-6 text-sm">See your score and what drives it.</p>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#0570de]" /> Solvency score and verified metrics</li>
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#0570de]" /> AI narrative preview</li>
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#0570de]" /> PDF unlock per report (€9)</li>
              </ul>
              <Link to="/register" className="w-full text-center py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium">
                Get started
              </Link>
            </div>

            <div className="bg-[#0570de] rounded-2xl p-8 border border-[#0570de] flex flex-col relative transform md:-translate-y-4 shadow-2xl">
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="text-3xl font-bold mb-6">€19<span className="text-lg font-normal text-white/80">/month</span></div>
              <p className="text-white/90 mb-6 text-sm">The full report you can hand to a lender.</p>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-white" /> Full AI narrative and risk flags</li>
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-white" /> Verifiable PDF reports with QR code</li>
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-white" /> Unlimited rental certificates</li>
              </ul>
              <Link to="/register" className="w-full text-center py-2 px-4 rounded-lg bg-white text-[#0570de] hover:bg-gray-100 transition-colors font-bold">
                Get started
              </Link>
            </div>

            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 flex flex-col">
              <h3 className="text-xl font-bold mb-2">Business</h3>
              <div className="text-3xl font-bold mb-6">€49<span className="text-lg font-normal text-white/60">/month</span></div>
              <p className="text-white/70 mb-6 text-sm">For freelancers working with lenders and agencies.</p>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#0570de]" /> Everything in Pro</li>
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#0570de]" /> Public API access with API keys</li>
                <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#0570de]" /> Shareable verification links</li>
              </ul>
              <Link to="/register" className="w-full text-center py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: How we keep it honest */}
      <section className="py-24 bg-white border-b border-[#e3e8ef]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">No made-up numbers</h2>
          <p className="text-xl text-[#0a2540]/70 leading-relaxed">
            Volatility, trend, client concentration and payment integrity are computed from your transactions before the AI
            writes a word. The AI must quote them, an auditor agent rejects drafts that contradict them, and if there is not
            enough data the report says so instead of guessing.
          </p>
        </div>
      </section>

      {/* SECTION 9: Final CTA */}
      <section className="py-24 bg-[#0570de] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to streamline your verifications?</h2>
          <p className="text-xl text-white/80 mb-10">Generate your first explainable solvency report from your own payment history in minutes.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="bg-white text-[#0570de] hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-bold transition-colors shadow-lg">
              Get started for free
            </Link>
            <Link to="/api-docs" className="bg-[#045cba] border border-white/20 text-white hover:bg-[#034d9e] px-8 py-4 rounded-lg text-lg font-medium transition-colors">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 10: Footer */}
      <footer className="bg-[#f6f8fa] pt-16 pb-8 border-t border-[#e3e8ef]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-block mb-4">
                <img src="/SolvAI-logo.png" alt="SolvAI Logo" className="h-6 w-auto grayscale opacity-80" />
              </Link>
              <p className="text-sm text-[#0a2540]/60 mb-4 pr-4">
                The modern platform for financial data aggregation and verification.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-[#0a2540]/70">
                <li><a href="#features" className="hover:text-[#0570de]">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#0570de]">Pricing</a></li>
                <li><a href="#lenders" className="hover:text-[#0570de]">For Lenders</a></li>
                <li><Link to="/api-docs" className="hover:text-[#0570de]">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[#0a2540]/70">
                <li><a href="#" className="hover:text-[#0570de]">About</a></li>
                <li><a href="#" className="hover:text-[#0570de]">Blog</a></li>
                <li><a href="#" className="hover:text-[#0570de]">Careers</a></li>
                <li><a href="#" className="hover:text-[#0570de]">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[#0a2540]/70">
                <li><Link to="/terms" className="hover:text-[#0570de]">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-[#0570de]">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-[#0570de]">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#e3e8ef] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#0a2540]/60">
              &copy; {new Date().getFullYear()} SolvAI, Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-[#0a2540]/60 bg-white px-3 py-1.5 rounded-full border border-[#e3e8ef]">
              <Sparkles className="w-4 h-4 text-purple-500" /> Built with Gemini AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// simple inline icon since I need one more for footer
function Sparkles(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    </svg>
  );
}
