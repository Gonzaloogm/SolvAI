# SolvAI
*SprintFounders Sprint Report — June 13, 2026*

---

## Market Research

**Viability Score:** 73/100
**Level:** Moderate

> The technical complexity of robust, explainable AI for diverse unstructured financial data is a significant hurdle, requiring specialized talent and continuous development. The single biggest existential risk is the ability to secure a critical mass of diverse, reputable lending partners willing to integrate and trust the AI-generated solvency reports.

### Ideal Customer Profile
Freelance creative professionals and service-based microbusiness owners (0-5 employees) in the EU/UK who lack traditional credit history, preventing access to working capital.

### Market Size
**$1.2B TAM / $180M SAM — 15% CAGR — EU/UK — 2024-2029**

### Strategic Differentiators
- CLAIM: AI-native explainable solvency reports for lenders. MECHANISM: Proprietary LLM pipeline analyzes diverse unstructured financial data (PDFs, CSVs, API feeds) to generate a human-readable, auditable credit narrative, reducing lender underwriting time and risk. MOAT TIMELINE: 18mo (requires continuous model training and data ingestion refinement). VALIDATION TEST: Lenders report a 30% reduction in manual underwriting time and a 15% increase in approval rates for referred applicants.
- CLAIM: Continuous, proactive financing matching. MECHANISM: AI agents continuously monitor user financial data for changes in solvency and proactively match them with new lender products or better terms as their profile improves, creating a 'set-it-and-forget-it' experience. MOAT TIMELINE: 18mo (requires robust data pipelines and real-time lender API integrations). VALIDATION TEST: 20% of users receive proactive financing offers within 6 months of initial report generation.
- CLAIM: Multi-source data aggregation and normalization. MECHANISM: Deep integrations with a wide array of payment processors, accounting software, and open banking APIs, plus robust OCR/NLP for unstructured document ingestion, creating a comprehensive financial profile that no single lender can easily replicate. MOAT TIMELINE: 3yr+ (requires ongoing integration development and data schema management). VALIDATION TEST: 90% of users successfully connect 3+ distinct financial data sources within 24 hours of onboarding.

### Competitive Landscape
| Company | Category | Weakness |
|---------|----------|----------|
| **Fundbox** | DIRECT NICHE COMPETITORS | Primarily a direct lender, not a pure matchmaker, limiting choice for users and potentially offering less competitive rates than a true marketplace. Their underwriting criteria are proprietary and not transparently explained to the user. |
| **Kabbage (Amex Business Blueprint)** | DIRECT NICHE COMPETITORS | Also a direct lender, now integrated into American Express's ecosystem, which may limit its appeal to non-Amex users or those seeking broader lender options. Onboarding can be lengthy for non-standard data sources. |
| **Lendio / Credibly (Archetype)** | DIRECT NICHE COMPETITORS | These platforms are more geared towards traditional SMBs with established credit histories and often require more manual input. Their alternative data analysis is less sophisticated and not AI-native, leading to higher rejection rates for truly underbanked profiles. |
| **Traditional Banks (e.g., Barclays, Deutsche Bank)** | INDIRECT INCUMBENT GIANTS | Complexity mismatch: Require extensive documentation (2+ years of audited financials, business plans) that freelancers and microbusinesses often lack. Price delta: High overhead for small loans makes them unprofitable for banks, leading to high minimum loan amounts or prohibitive fees. Feature bloat: Their systems are designed for larger corporations, not agile micro-entities. |
| **Stripe Capital / PayPal Working Capital** | INDIRECT INCUMBENT GIANTS | Platform lock-in: Only available to businesses processing payments through their respective platforms, excluding those using other processors or invoicing directly. Limited options: Offer only their own financing products, no marketplace for competitive rates or diverse loan types. |
| **Personal Credit Cards / Friends & Family Loans** | SUBSTITUTES | High interest rates (18-30% APR) for credit cards, impacting personal credit scores. Friends & family loans carry significant social and relationship risk. Both lack the professional structure and scale needed for business growth. The cost of these workarounds is often emotional stress and higher financial burden. |

### Technical Barriers
**AI/ML requirements:** Core value prop relies on LLM-based agents (Gemini) for unstructured data extraction, sentiment analysis from reviews, and generating explainable credit narratives. This requires fine-tuning models for financial domain, ensuring explainable AI (XAI) outputs for regulatory compliance and lender trust, and managing inference costs. Model drift and bias detection are critical.

**Integration burden:** Day 1 value requires integrations with at least 3-5 major payment processors/accounting platforms (Stripe, PayPal, Xero, QuickBooks) and 2-3 initial lending partners. Each lender API integration is a custom project (estimated 2-4 weeks per integration), involving unique data mapping, authentication, and status update protocols.

**API dependency risks:** Critical dependencies on Stripe, PayPal, Xero, QuickBooks, and various Open Banking (PSD2) APIs. Risks include rate limits, API deprecation, inconsistent data formats, and security vulnerabilities. Each API requires specific authentication and error handling, adding significant integration overhead.

**Security surface area:** Handling highly sensitive financial data (income, expenses, transaction history) and PII. Requires robust encryption (at rest and in transit), strict access controls, and regular security audits. Compliance with GDPR and potential financial industry security standards (e.g., ISO 27001) is paramount.

**Data pipeline complexity:** Ingesting high volume and variety of data: structured (API JSON), semi-structured (CSV exports requiring schema inference), and unstructured (PDF bank statements requiring OCR and NLP parsing). Normalization, reconciliation, and time-series analysis for seasonality and growth trends are complex, especially with mixed currencies and varying data granularity.

**Scalability inflection points:** Initial architecture must handle hundreds of concurrent data uploads and AI agent runs. At ~10,000 active users, the data processing pipeline will require distributed computing (e.g., Spark) and a robust message queuing system to prevent bottlenecks during peak usage. Real-time monitoring of agent performance and cost will be essential.

### Regulatory Landscape

- **Primary Regulation:** GDPR (General Data Protection Regulation) Article 28 (data processing agreements), PSD2 (Payment Services Directive 2) for Open Banking access, AMLD (Anti-Money Laundering Directive) for KYC/AML checks on users and lenders, Consumer Credit Directive (CCD) if any direct credit advice is given (though positioned as information broker).
- **Compliance Timeline:** 6-9 months to achieve initial GDPR, PSD2, and AMLD compliance for MVP, including legal review of terms, data processing agreements, and security infrastructure. Full enterprise-grade compliance (e.g., ISO 27001) could take 12-18 months.
- **Est. Annual Cost:** Estimated annual cost of compliance: €50,000 - €150,000 (legal counsel, DPO, security audits, tooling for data privacy/security, KYC/AML checks).

---

## Financial Model

### Pricing Tiers

| Tier | Price/month | Target % |
|------|-------------|----------|
| Starter | $15 | N/A |
| Pro | $45 | N/A |
| Premium | $95 | N/A |

### 12-Month Projection

- **Month 1 Revenue:** $542,7
- **Month 12 Revenue:** $42.216,06
- **Ending Cash Position:** $420.832,65

### Survival Levers

- Delay first engineering hire by 2 months (+$12,000 runway)
- Negotiate 3 months free on key software subscriptions (+$1,500 runway)
- Apply to AWS Activate for $25,000 in cloud credits to reduce infrastructure costs

---

## VC Analysis

**VC Score: 80/100**

### Bull Case
> The platform becomes the indispensable infrastructure for alternative lenders to efficiently underwrite and serve the rapidly growing, globally distributed freelance economy, creating a powerful network effect between capital providers and underbanked users. This leads to an acquisition by a major fintech platform like Revolut or a global payment processor like Stripe, or an IPO as the leading credit infrastructure for the gig economy.

### Bear Case
> Alternative lenders, wary of unproven AI models and regulatory liability, refuse to deeply integrate or trust the solvency reports, leading to low conversion and negligible commission revenue. The lack of diverse lender participation starves the platform of suitable financing options, causing user churn as they fail to secure credit within 24 months.

### Critical Questions
1. Your model assumes a 2% commission on €5,000 loans, but the entire value proposition hinges on lenders trusting an AI-generated, explainable solvency report for underwriting. What specific regulatory and liability frameworks are in place to indemnify lenders against bad debt from your referrals, and what existing data proves lenders will integrate with an unproven AI system over their proprietary models?
2. Your core product is an 'explainable alternative solvency report' generated by LLM agents from diverse, unstructured data. What concrete metrics will you provide to lenders to demonstrate the accuracy and consistency of these reports, and how will you mitigate the inevitable 'hallucinations' or biases inherent in LLMs when making critical financial assessments that directly impact a lender's balance sheet?
3. Your model shows a healthy LTV:CAC of 3.49 and a 7-month payback, but it doesn't clearly delineate the CAC for acquiring lending partners versus end-users. Given that lender acquisition is an 'existential risk,' what is your proven cost and sales cycle to onboard a new, active lending partner, and how does this impact your overall blended CAC and runway?

### Due Diligence Risks
| Category | Probability | Deal Breaker |
|----------|-------------|--------------|
| Legal | Medium | Yes, if core IP is not owned or is encumbered. |
| Team | High | Yes, if that person leaves and IP/knowledge is not transferable. |
| Market | Medium | Yes, if there's no proof of active lender commitment, as this is the core of the business model. |
| Legal | Medium | Reprice, potentially. Could be a deal-breaker if licensing is prohibitively expensive or slow. |
| Technical | Medium | Yes, if it leads to immediate regulatory fines or a fundamental flaw in data collection. |
| Financial | Medium | Reprice, likely. Could become a deal-breaker if costs are uncontrollable. |

---

## Technical Architecture

### MVP Scope
> An AI-powered platform for underbanked EU/UK freelancers and microbusinesses to generate explainable solvency reports from diverse financial data, matching them with alternative lenders to secure working capital faster.

---

## UI/UX Design

Full design specifications available in ai-context.md export.

---
