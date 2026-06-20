import io
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from app.models.solvency_report import SolvencyReport
import os

def generate_solvency_pdf(report: SolvencyReport) -> io.BytesIO:
    """
    Generate a professional PDF using WeasyPrint and an HTML template.
    """
    
    # 1. Prepare data mapping
    report_data = report.report_data or {}
    raw_summary = report_data.get("financial_summary") or {}
    
    # Provide defaults for older reports missing this data
    safe_raw_data = {
        "data_source_count": raw_summary.get("data_source_count", 0),
        "connected_platforms": raw_summary.get("connected_platforms", []),
        "analysis_period_months": raw_summary.get("analysis_period_months", 12),
        "avg_monthly_revenue": float(raw_summary.get("avg_monthly_revenue", 0.0)),
        "monthly_revenue_series": raw_summary.get("monthly_revenue_series", []),
        "client_concentration": raw_summary.get("client_concentration") or {
            "distinct_clients": 0,
            "top_client_percent": 0.0,
            "top_3_clients_percent": 0.0
        }
    }
    
    context = {
        "report_id": str(report.id),
        "generated_at": report.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if report.created_at else "N/A",
        "data": report_data,
        "raw_data": safe_raw_data
    }
    
    # 2. Render Jinja2 template
    template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("report_template.html")
    html_out = template.render(context)
    
    # 3. Generate PDF
    pdf_buffer = io.BytesIO()
    HTML(string=html_out).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    return pdf_buffer
