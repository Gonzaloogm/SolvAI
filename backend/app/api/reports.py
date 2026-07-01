from fastapi import APIRouter, Query
from fastapi.responses import Response
from datetime import datetime, timedelta
import random
import io
import base64
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

router = APIRouter()

def generate_mock_pl_data(months: int = 12):
    now = datetime.utcnow()
    period_start = (now - timedelta(days=30*months)).strftime('%Y-%m-%d')
    period_end = now.strftime('%Y-%m-%d')
    
    monthly = []
    base_rev = 5000
    for i in range(months):
        rev = base_rev + random.randint(-1000, 2000)
        base_rev += 200  # upward trend
        monthly.append({
            'month': (now - timedelta(days=30*(months-1-i))).strftime('%b %Y'),
            'revenue': rev,
            'expenses': rev * 0.4
        })
        
    revenues = [m['revenue'] for m in monthly]
    total_rev = sum(revenues)
    avg_rev = total_rev / months
    
    return {
        'period_start': period_start,
        'period_end': period_end,
        'currency': 'EUR',
        'revenue': {
            'total': total_rev,
            'monthly': monthly,
            'avg_monthly': avg_rev,
            'highest_month': max(revenues),
            'lowest_month': min(revenues)
        },
        'growth': {
            'mom_avg': 4.5,
            'trend': 'upward',
            'yoy_change': 25.4
        },
        'client_analysis': {
            'total_clients': 15,
            'top_client_share': 35.5,
            'top_3_share': 65.0,
            'concentration_risk': 'Medium'
        },
        'data_sources': ['STRIPE'],
        'generated_at': now.isoformat(),
        'summary_text': 'Revenue shows a steady upward trend over the past 12 months with a 25.4% YoY growth. Client concentration is moderate, with the top 3 clients accounting for 65% of total revenue.'
    }

@router.get("/pl-statement")
async def get_pl_statement(months: int = Query(12, ge=1, le=60)):
    return generate_mock_pl_data(months)

def generate_revenue_chart(monthly_data):
    months = [m['month'] for m in monthly_data]
    revenues = [m['revenue'] for m in monthly_data]
    
    # 3-month moving average
    ma = []
    for i in range(len(revenues)):
        if i < 2:
            ma.append(None)
        else:
            ma.append(sum(revenues[i-2:i+1]) / 3)
            
    fig, ax = plt.subplots(figsize=(8, 4))
    x = range(len(months))
    ax.bar(x, revenues, color='#0570de', label='Revenue')
    ax.plot(x, ma, color='#ff9800', marker='o', linewidth=2, label='3-Month MA')
    
    ax.set_xticks(x)
    ax.set_xticklabels(months, rotation=45)
    ax.set_ylabel('Revenue (EUR)')
    ax.legend()
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

def generate_client_chart():
    labels = ['Top Client', 'Clients 2-3', 'Other Clients']
    sizes = [35.5, 29.5, 35.0]
    colors = ['#0570de', '#4fc3f7', '#e0e0e0']
    
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
    ax.axis('equal')
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

@router.get("/pl-statement/pdf")
async def get_pl_statement_pdf(months: int = Query(12, ge=1, le=60)):
    data = generate_mock_pl_data(months)
    rev_chart_b64 = generate_revenue_chart(data['revenue']['monthly'])
    client_chart_b64 = generate_client_chart()
    
    env = Environment(loader=FileSystemLoader('app/templates'))
    template = env.get_template('pl_statement_template.html')
    
    html_out = template.render(
        data=data,
        rev_chart_b64=rev_chart_b64,
        client_chart_b64=client_chart_b64
    )
    
    pdf = HTML(string=html_out).write_pdf()
    
    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=pl_statement.pdf"
    })
