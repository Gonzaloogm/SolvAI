import React from 'react';
import { Check, CreditCard, AlertTriangle, Zap, ArrowUpRight } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function AccountPage() {
  return (
    <div className="page-enter">
      {/* ── 1. PAGE HEADER ── */}
      <div>
        <h1 className="text-xl font-semibold text-[#0a2540]">Account settings</h1>
        <p className="text-sm text-[#697386] mt-1">Manage your subscription and billing</p>
      </div>

      {/* ── 2. CURRENT PLAN CARD ── */}
      <div className="bg-white border border-[#e3e8ef] rounded-lg p-6 mt-6">
        {/* Top section */}
        <div className="flex items-center justify-between">
          {/* Left — plan badge + status */}
          <div className="flex items-center gap-3">
            <span className="bg-[#f0f2f5] text-[#0a2540] text-base font-semibold px-4 py-1.5 rounded-full">
              Free
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1a9e6e] inline-block" />
              <span className="text-sm text-[#1a9e6e] font-medium">Active</span>
            </span>
          </div>

          {/* Center — limits */}
          <div className="flex items-center gap-0 text-sm text-[#425466]">
            100 reports/mo · 1 data source · Community support
          </div>

          {/* Right — upgrade button */}
          <button className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] transition-colors">
            Upgrade plan
          </button>
        </div>

        {/* Bottom section — usage bars */}
        <div className="mt-5 pt-5 border-t border-[#e3e8ef]">
          <div className="grid grid-cols-2 gap-6">
            {/* Reports */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-[#425466]">Reports</span>
                <span className="text-[#697386]">23/100</span>
              </div>
              <div className="h-1.5 bg-[#e3e8ef] rounded-full">
                <div className="w-[23%] bg-[#0570de] rounded-full h-full" />
              </div>
            </div>

            {/* API Calls */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-[#425466]">API Calls</span>
                <span className="text-[#697386]">1,240/10,000</span>
              </div>
              <div className="h-1.5 bg-[#e3e8ef] rounded-full">
                <div className="w-[12.4%] bg-[#0570de] rounded-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. PLANS COMPARISON ── */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-[#0a2540] mb-4">Choose a plan</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Card 1 — Free */}
          <div className="bg-white border border-[#e3e8ef] rounded-lg p-6">
            <p className="text-lg font-semibold text-[#0a2540]">Free</p>
            <div className="mt-2">
              <span className="text-3xl font-bold text-[#0a2540]">€0</span>
              <span className="text-sm text-[#697386] ml-1">/month</span>
            </div>

            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">100 reports/month</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">1 data source</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">Community support</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">Basic analytics</span>
              </li>
            </ul>

            <div className="mt-6 w-full bg-[#f0f2f5] text-[#697386] cursor-not-allowed rounded-lg px-4 py-2.5 text-sm font-medium text-center">
              Current plan
            </div>
          </div>

          {/* Card 2 — Pro (highlighted) */}
          <div className="relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0570de] text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap z-10">
              Most popular
            </span>
            <div className="bg-white border-2 border-[#0570de] rounded-lg p-6 relative h-full">
              <p className="text-lg font-semibold text-[#0a2540]">Pro</p>
              <div className="mt-2">
                <span className="text-3xl font-bold text-[#0a2540]">€29</span>
                <span className="text-sm text-[#697386] ml-1">/month</span>
              </div>
              <p className="text-xs text-[#697386] mt-1">prod_Um5HdQslaAVfSH</p>

              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#1a9e6e]" />
                  <span className="text-sm text-[#425466]">1,000 reports/month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#1a9e6e]" />
                  <span className="text-sm text-[#425466]">10 data sources</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#1a9e6e]" />
                  <span className="text-sm text-[#425466]">Priority support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#1a9e6e]" />
                  <span className="text-sm text-[#425466]">Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#1a9e6e]" />
                  <span className="text-sm text-[#425466]">Custom branding</span>
                </li>
              </ul>

              <button className="mt-6 w-full bg-[#0570de] text-white hover:bg-[#0462c7] rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>

          {/* Card 3 — Business */}
          <div className="bg-white border border-[#e3e8ef] rounded-lg p-6">
            <p className="text-lg font-semibold text-[#0a2540]">Business</p>
            <div className="mt-2">
              <span className="text-3xl font-bold text-[#0a2540]">€99</span>
              <span className="text-sm text-[#697386] ml-1">/month</span>
            </div>
            <p className="text-xs text-[#697386] mt-1">prod_Um5JyQcX6PpBnb</p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">Unlimited reports</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">Unlimited data sources</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">Dedicated support + SLA</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">Custom integrations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#1a9e6e]" />
                <span className="text-sm text-[#425466]">SSO / SAML</span>
              </li>
            </ul>

            <button className="mt-6 w-full bg-white border border-[#e3e8ef] text-[#425466] hover:bg-[#f6f8fa] rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors">
              Contact sales
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. BILLING CARD ── */}
      <div className="bg-white border border-[#e3e8ef] rounded-lg p-6 mt-8">
        <h2 className="text-base font-semibold text-[#0a2540] mb-4">Billing</h2>

        {/* Payment method — empty state */}
        <div className="flex flex-col items-center py-8">
          <CreditCard className="w-10 h-10 text-[#d0d5dd]" />
          <p className="text-sm font-medium text-[#0a2540] mt-3">No payment method</p>
          <p className="text-xs text-[#697386] mt-1">Add a card to enable automatic billing</p>
          <button className="mt-3 text-sm font-medium text-[#0570de] border border-[#e3e8ef] rounded-lg px-4 py-2 hover:bg-[#f6f8fa] transition-colors">
            + Add card
          </button>
        </div>

        {/* Invoices */}
        <div className="mt-6 pt-6 border-t border-[#e3e8ef]">
          <h3 className="text-sm font-semibold text-[#0a2540] mb-2">Invoices</h3>
          <div className="text-center py-8">
            <p className="text-sm text-[#697386]">No invoices yet</p>
          </div>
        </div>
      </div>

      {/* ── 5. DANGER ZONE ── */}
      <div className="bg-white border border-[#e3e8ef] border-l-[3px] border-l-[#df1b41] rounded-lg p-6 mt-8">
        <h2 className="text-base font-semibold text-[#df1b41]">Danger zone</h2>

        <div className="mt-3 flex items-start justify-between gap-8">
          {/* Left — description */}
          <div>
            <p className="text-sm font-medium text-[#0a2540]">Delete account</p>
            <p className="text-xs text-[#697386] mt-1 max-w-md">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>

          {/* Right — delete button */}
          <button className="bg-white border border-[#fca5a5] text-[#df1b41] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#fef2f2] whitespace-nowrap flex items-center gap-2 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
