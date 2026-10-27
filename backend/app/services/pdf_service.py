import io
import os
import logging
import base64
import statistics
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from jinja2 import Environment, FileSystemLoader, DebugUndefined
from weasyprint import HTML
from app.models.solvency_report import SolvencyReport

logger = logging.getLogger(__name__)

# --- CONFIGURATION & STYLING ---
COLOR_PRIMARY = '#6366f1'  # Indigo
COLOR_SUCCESS = '#10b981'  # Emerald
COLOR_WARNING = '#f59e0b'  # Amber
COLOR_DANGER = '#ef4444'   # Red
COLOR_TEXT = '#3f3f46'     # Zinc 700
COLOR_BG = '#f4f4f5'       # Zinc 100

def generate_solvency_pdf(report: SolvencyReport) -> io.BytesIO:
    """
    Generate a professional PDF using WeasyPrint and an HTML template.
    This module contains an extensive Advanced Analytics Engine and Visualization
    Pipeline to generate deep insights from the LangGraph LLM output.
    """
    rd = report.report_data or {}
    
    # ==========================================
    # 1. DEEP DATA NORMALIZATION ENGINE
    # ==========================================
    
    def find_key(data, target_keys, default=None):
        """Recursively search for a key in a nested dictionary."""
        if isinstance(data, dict):
            for k in target_keys:
                if k in data:
                    return data[k]
            for v in data.values():
                result = find_key(v, target_keys, default=None)
                if result is not None:
                    return result
        elif isinstance(data, list):
            for item in data:
                result = find_key(item, target_keys, default=None)
                if result is not None:
                    return result
        return default

    def extract_monthly_series(data):
        """Finds the monthly revenue series list wherever it is hidden."""
        if isinstance(data, dict):
            for k, v in data.items():
                if k == 'monthly_revenue_series' and isinstance(v, list):
                    return v
                res = extract_monthly_series(v)
                if res: return res
        elif isinstance(data, list):
            for item in data:
                res = extract_monthly_series(item)
                if res: return res
        return []

    # ==========================================
    # 2. DATA EXTRACTION
    # ==========================================
    
    # 2.1 Core Metrics
    raw_score = find_key(rd, ['overall_score', 'overall_solvency_score', 'solvency_score', 'score'])
    try:
        overall_score = int(raw_score)
    except:
        overall_score = 50

    rating = str(find_key(rd, ['recommendation', 'verdict', 'decision', 'rating'], 'N/A')).upper()
    narrative = str(find_key(rd, ['justification', 'narrative', 'summary', 'overall_assessment_summary', 'disclaimer'], 'No narrative available.'))
    industry_context = str(find_key(rd, ['industry_context', 'macroeconomic_comparison', 'market_analysis'], 'Industry context not provided by the AI.'))

    sub_score = overall_score

    # 2.2 Component Analysis
    # A factor without its own score is shown as not assessed, never given the overall score
    def build_component(target_keys, fallback_description='Not assessed: no data for this factor.'):
        comp_data = find_key(rd, target_keys)
        if isinstance(comp_data, dict):
            score = comp_data.get('score', comp_data.get('rating'))
            return {
                'score': score if isinstance(score, (int, float)) else None,
                'description': comp_data.get('analysis', comp_data.get('assessment', comp_data.get('description', fallback_description))),
                'lender_implications': comp_data.get('lender_implications', comp_data.get('trend', comp_data.get('impact', '')))
            }
        elif isinstance(comp_data, str):
            return {'score': None, 'description': comp_data, 'lender_implications': ''}
        return {'score': None, 'description': fallback_description, 'lender_implications': ''}

    income_stability = build_component(['income_stability', 'revenue_stability', 'revenue_volatility'])
    growth_trend = build_component(['growth_trend', 'trend_analysis', 'growth'])
    seasonality = build_component(['seasonality', 'seasonality_analysis'])
    client_concentration_comp = build_component(['client_concentration', 'client_concentration_analysis'])
    # Stored as reputation_signals; grounded in refunds, disputes and history length
    payment_integrity_comp = build_component(['reputation_signals'])
    
    # 2.3 Risk Flags, Strengths, and Recommendations
    risk_flags = []
    strengths = []
    recommendations_list = []
    
    # Strengths extraction
    s_data = find_key(rd, ['strengths', 'positive_indicators'], [])
    if isinstance(s_data, list):
        for s in s_data:
            if isinstance(s, dict):
                title = s.get('title', 'Strength')
                desc = s.get('description', '')
                strengths.append({"title": title, "desc": desc})
            elif isinstance(s, str):
                strengths.append({"title": "Strength", "desc": s})

    # Weaknesses / Risks extraction
    concerns = find_key(rd, ['key_concerns', 'weaknesses', 'risk_flags', 'risk_factors_weighing_down_solvency'], [])
    if isinstance(concerns, list):
        for c in concerns:
            if isinstance(c, dict):
                title = c.get('title', c.get('category', 'Risk'))
                desc = c.get('description', c.get('finding', ''))
                risk_flags.append({"title": title, "desc": desc})
                
                # Associated remediations
                remediations = c.get('actionable_remediation_plan', c.get('remediations', []))
                if isinstance(remediations, list):
                    recommendations_list.extend([str(r) for r in remediations])
            elif isinstance(c, str):
                risk_flags.append({"title": "Risk Factor", "desc": c})

    # Standalone Recommendations
    standalone_recs = find_key(rd, ['recommendations', 'actionable_remediation_plan'], [])
    if isinstance(standalone_recs, list):
        for r in standalone_recs:
            if isinstance(r, dict):
                title = r.get('plan_title', 'Recommendation')
                steps = r.get('steps', [])
                if isinstance(steps, list):
                    recommendations_list.extend(steps)
                else:
                    recommendations_list.append(title)
            elif isinstance(r, str) and r not in recommendations_list:
                recommendations_list.append(r)

    # Clean up recommendations to remove markdown bolding for UI
    clean_recs = [r.replace('**', '') for r in recommendations_list]

    # 2.4 Financial Series & Data Formatting
    raw_monthly_series = extract_monthly_series(rd)
    monthly_series = []
    for m in raw_monthly_series:
        if isinstance(m, dict):
            monthly_series.append({
                'month': m.get('month', 'Unknown'),
                'transaction_count': m.get('transaction_count', 0),
                'total': float(m.get('total', 0.0))
            })
            
    # Calculate average revenue robustly
    avg_rev = find_key(rd, ['avg_monthly_revenue', 'average_monthly_revenue'], 0.0)
    try:
        avg_rev = float(avg_rev)
    except:
        avg_rev = 0.0
        
    if avg_rev == 0.0 and len(monthly_series) > 0:
        avg_rev = sum(m['total'] for m in monthly_series) / len(monthly_series)
    
    # Client Concentration Data
    cc_data = rd.get('financial_summary', {}).get('client_concentration') or {}
    dist_clients = cc_data.get('distinct_clients_count', cc_data.get('distinct_clients', 0)) if isinstance(cc_data, dict) else 0
    top_1 = cc_data.get('top_client_percentage', cc_data.get('top_client_percent', 0.0)) if isinstance(cc_data, dict) else 0.0
    top_3 = cc_data.get('top_3_clients_percentage', cc_data.get('top_3_clients_percent', 0.0)) if isinstance(cc_data, dict) else 0.0

    try:
        top_1 = float(top_1)
        top_3 = float(top_3)
    except:
        top_1, top_3 = 0.0, 0.0

    # ==========================================
    # 3. ADVANCED ANALYTICS ENGINE
    # ==========================================
    
    analytics = {
        "mom_growth": [],
        "avg_mom_growth": 0.0,
        "revenue_volatility": 0.0,
        "cov": 0.0,
        "hhi_index": 0.0,
        "insights": []
    }

    if len(monthly_series) >= 2:
        # Sort by month (assuming YYYY-MM format)
        sorted_series = sorted(monthly_series, key=lambda x: x['month'])
        revenues = [m['total'] for m in sorted_series]
        
        # MoM Growth
        for i in range(1, len(revenues)):
            prev = revenues[i-1]
            curr = revenues[i]
            if prev > 0:
                growth = ((curr - prev) / prev) * 100
            else:
                growth = 0.0
            analytics["mom_growth"].append(growth)
            
        analytics["avg_mom_growth"] = sum(analytics["mom_growth"]) / len(analytics["mom_growth"])
        
        # Volatility
        analytics["revenue_volatility"] = statistics.stdev(revenues)
        analytics["cov"] = (analytics["revenue_volatility"] / avg_rev * 100) if avg_rev > 0 else 0.0
        
        # Insights Generation
        if analytics["avg_mom_growth"] > 5:
            analytics["insights"].append(f"Strong average MoM growth of {analytics['avg_mom_growth']:.1f}%.")
        elif analytics["avg_mom_growth"] < -5:
            analytics["insights"].append(f"Concerning negative average MoM growth of {analytics['avg_mom_growth']:.1f}%.")
        else:
            analytics["insights"].append(f"Stable MoM growth trajectory hovering around {analytics['avg_mom_growth']:.1f}%.")
            
        if analytics["cov"] > 30:
            analytics["insights"].append(f"High revenue volatility (CoV: {analytics['cov']:.1f}%). Cash flow management is critical.")
        else:
            analytics["insights"].append(f"Low to moderate revenue volatility (CoV: {analytics['cov']:.1f}%). Highly predictable cash flows.")

    # Approximate HHI Index calculation based on Top 3 clients
    # HHI = sum of squares of market shares. Max 10,000
    if top_1 > 0:
        # Estimate: Top 1 squared, plus Top 2-3 averaged squared, plus the rest
        t23_share = top_3 - top_1
        t2_share = t23_share / 2
        t3_share = t23_share / 2
        rest_share = max(0, 100 - top_3)
        rest_clients = max(1, dist_clients - 3)
        rest_avg = rest_share / rest_clients
        
        hhi = (top_1**2) + (t2_share**2) + (t3_share**2) + (rest_clients * (rest_avg**2))
        analytics["hhi_index"] = hhi
        
        if hhi > 2500:
            analytics["insights"].append(f"Highly concentrated client base (Est. HHI: {int(hhi)}). Significant reliance on key accounts.")
        elif hhi > 1500:
            analytics["insights"].append(f"Moderately concentrated client base (Est. HHI: {int(hhi)}).")
        else:
            analytics["insights"].append(f"Well-diversified client base (Est. HHI: {int(hhi)}). Low single-client failure risk.")

    # Reports generated with deterministic quant metrics use those exact figures
    # (same numbers the AI was grounded on); older reports keep the estimates above.
    quant = rd.get('quant_metrics') or {}
    analytics["hhi_is_estimate"] = True
    if quant:
        volatility = quant.get('volatility') or {}
        trend = quant.get('trend') or {}
        weak = quant.get('weak_months') or {}
        concentration = quant.get('client_concentration') or {}
        if volatility.get('cov_percent') is not None:
            analytics["cov"] = volatility['cov_percent']
            analytics["revenue_volatility"] = volatility.get('std_dev', analytics["revenue_volatility"])
        if trend.get('slope_percent_per_month') is not None:
            analytics["avg_mom_growth"] = round(trend['slope_percent_per_month'], 1) + 0.0
            analytics["growth_label"] = "Revenue Trend (regression, per month)"
        if concentration.get('hhi') is not None:
            analytics["hhi_index"] = concentration['hhi']
            analytics["hhi_is_estimate"] = False
        analytics["insights"] = [
            m['explanation']
            for m in (volatility, trend, weak, concentration)
            if m.get('explanation')
        ] + list(quant.get('data_quality_notes') or [])

    # ==========================================
    # 4. VISUALIZATION ENGINE (MATPLOTLIB)
    # ==========================================
    
    def fig_to_base64(fig):
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=150, transparent=True)
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_str

    charts = {}

    if len(monthly_series) > 0:
        sorted_series = sorted(monthly_series, key=lambda x: x['month'])
        months = [m['month'].split('-')[-1] for m in sorted_series] # Just show month number or short name for space
        revs = [m['total'] for m in sorted_series]

        # 4.1 Revenue Trend Chart
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.bar(months, revs, color=COLOR_PRIMARY, alpha=0.7, label='Revenue')
        
        # 3-Month Moving Average
        if len(revs) >= 3:
            ma = np.convolve(revs, np.ones(3)/3, mode='valid')
            # Pad with None for the first two months to align plot
            ma_padded = [None, None] + list(ma)
            ax.plot(months, ma_padded, color=COLOR_WARNING, marker='o', linewidth=2, label='3-Mo Moving Avg')

        ax.set_ylabel('Revenue (EUR)', color=COLOR_TEXT)
        ax.set_title('Historical Revenue Trend', color=COLOR_TEXT, fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e4e4e7')
        ax.spines['bottom'].set_color('#e4e4e7')
        ax.legend()
        charts['revenue_trend'] = fig_to_base64(fig)

    # 4.2 Client Concentration Pie Chart
    if top_1 > 0:
        fig, ax = plt.subplots(figsize=(5, 5))
        labels = ['Top Client', 'Clients 2-3', 'Other Clients']
        sizes = [top_1, max(0, top_3 - top_1), max(0, 100 - top_3)]
        colors = [COLOR_PRIMARY, COLOR_WARNING, COLOR_SUCCESS]
        explode = (0.1, 0, 0)  # explode 1st slice
        
        # Filter out 0% slices
        filter_idx = [i for i, s in enumerate(sizes) if s > 0]
        f_labels = [labels[i] for i in filter_idx]
        f_sizes = [sizes[i] for i in filter_idx]
        f_colors = [colors[i] for i in filter_idx]
        
        ax.pie(f_sizes, explode=explode[:len(f_sizes)] if len(f_sizes)==3 else None, 
               labels=f_labels, colors=f_colors, autopct='%1.1f%%',
               shadow=False, startangle=140, textprops={'color': COLOR_TEXT})
        ax.set_title('Revenue Dependency', color=COLOR_TEXT, fontweight='bold')
        charts['client_pie'] = fig_to_base64(fig)
        
    # 4.3 Radar Chart for Component Scores
    try:
        # Every factor score is "higher is healthier"; factors without a score are left out
        axes = [
            ('Income Stability', income_stability.get('score')),
            ('Growth Trend', growth_trend.get('score')),
            ('Seasonality', seasonality.get('score')),
            ('Client Diversification', client_concentration_comp.get('score')),
            ('Payment Integrity', payment_integrity_comp.get('score')),
        ]
        axes = [(name, score) for name, score in axes if score is not None]
        if len(axes) < 3:
            raise ValueError("fewer than three scored factors")
        categories = [name for name, _ in axes]
        N = len(categories)
        
        scores = [score for _, score in axes]
        
        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        scores += scores[:1]
        angles += angles[:1]
        
        fig, ax = plt.subplots(figsize=(5, 5), subplot_kw=dict(polar=True))
        ax.set_theta_offset(np.pi / 2)
        ax.set_theta_direction(-1)
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, color=COLOR_TEXT, size=8)
        ax.set_rlabel_position(0)
        plt.yticks([25, 50, 75], ["25", "50", "75"], color="grey", size=7)
        plt.ylim(0, 100)
        
        ax.plot(angles, scores, linewidth=2, linestyle='solid', color=COLOR_SUCCESS)
        ax.fill(angles, scores, color=COLOR_SUCCESS, alpha=0.25)
        ax.set_title('Risk Profile Radar', color=COLOR_TEXT, fontweight='bold', y=1.1)
        charts['radar'] = fig_to_base64(fig)
    except Exception as e:
        logger.error(f"Failed to generate radar chart: {e}")

    # ==========================================
    # 5. DATA ASSEMBLY FOR JINJA2
    # ==========================================

    data_for_template = {
        # The applicant is the user's organisation; older reports did not store it
        "applicant_name": rd.get('organization_name') or 'Not specified',
        "organization_name": "SolvAI (automated assessment)",
        "overall_score": overall_score,
        "rating": rating,
        "narrative": narrative,
        "industry_context": industry_context,
        "income_stability": income_stability,
        "growth_trend": growth_trend,
        "seasonality": seasonality,
        "client_concentration": client_concentration_comp,
        "reputation_signals": payment_integrity_comp,
        "strengths": strengths,
        "risk_flags": risk_flags,
        "recommendations": clean_recs,
        # Real transaction references when the report has evidence; older reports list platforms
        "data_references": (
            rd.get("data_references") if (rd.get("quant_metrics") or {}).get("evidence")
            else rd.get("financial_summary", {}).get("connected_platforms", ["STRIPE"])
        ),
    }

    raw_data_for_template = {
        "data_source_count": find_key(rd, ['data_source_count'], 1),
        "connected_platforms": rd.get("financial_summary", {}).get("connected_platforms", ["STRIPE"]),
        "analysis_period_months": find_key(rd, ['analysis_period_months'], 24),
        "avg_monthly_revenue": avg_rev,
        "monthly_revenue_series": monthly_series,
        "client_concentration": {
            "distinct_clients": dist_clients,
            "top_client_percent": top_1,
            "top_3_clients_percent": top_3
        },
        "analytics": analytics,
        "charts": charts,
        "source_breakdown": quant.get("source_breakdown") or rd.get("financial_summary", {}).get("source_breakdown") or [],
        "evidence": quant.get("evidence") or {},
    }
    
    context = {
        "report_id": str(report.id),
        "generated_at": report.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if report.created_at else "N/A",
        "data": data_for_template,
        "raw_data": raw_data_for_template,
        "report_data": rd,  # Include raw report data for mortgage template
        "qr_code_b64": getattr(report, "qr_code_b64", None),
        "verification_id": getattr(report, "verification_id", None),
        "verify_url": getattr(report, "verify_url", None)
    }
    
    # ==========================================
    # 6. RENDER & GENERATE PDF
    # ==========================================
    
    template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    env = Environment(
        loader=FileSystemLoader(template_dir),
        # DebugUndefined prints {{var}} for missing vars instead of silently rendering
        # empty strings, making template bugs immediately visible in the PDF output.
        # Switch to StrictUndefined in staging once all templates are validated.
        undefined=DebugUndefined,
    )
    
    report_type = getattr(report, "report_type", "FULL")
    if report_type == "RENTAL":
        template_name = "rental_template.html"
    elif report_type == "MORTGAGE_ASSESSMENT":
        template_name = "mortgage_template.html"
    else:
        template_name = "report_template.html"
        
    template = env.get_template(template_name)
    html_out = template.render(context)
    
    pdf_buffer = io.BytesIO()
    HTML(string=html_out).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    return pdf_buffer

