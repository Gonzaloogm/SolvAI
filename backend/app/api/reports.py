import asyncio
import base64
import io

import matplotlib
import matplotlib.pyplot as plt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User
from app.services.pl_statement import StatementUnavailable, build_pl_statement
from app.tasks.report_generation import _build_financial_summary

matplotlib.use('Agg')

router = APIRouter()


async def _statement_for(user: User, db: AsyncSession, months: int) -> dict:
    sources = (await db.execute(
        select(FinancialDataSource).where(
            FinancialDataSource.user_id == user.id,
            FinancialDataSource.is_deleted.is_(False),
            FinancialDataSource.status == "CONNECTED",
        )
    )).scalars().all()

    # Sources without a stored snapshot are fetched live (blocking SDK calls)
    summary = await asyncio.get_running_loop().run_in_executor(None, _build_financial_summary, sources)
    try:
        return build_pl_statement(summary, months)
    except StatementUnavailable as e:
        raise HTTPException(status_code=404, detail=str(e))


def _png(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=200)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


def generate_revenue_chart(monthly_data):
    months = [m['month'] for m in monthly_data]
    revenues = [m['revenue'] for m in monthly_data]

    # 3-month moving average
    ma = [None if i < 2 else sum(revenues[i-2:i+1]) / 3 for i in range(len(revenues))]

    fig, ax = plt.subplots(figsize=(8, 4))
    x = range(len(months))
    colors = ['#a5c8f0' if m['partial'] else '#0570de' for m in monthly_data]
    ax.bar(x, revenues, color=colors, label='Revenue')
    if any(m['outflows'] is not None for m in monthly_data):
        ax.plot(x, [m['outflows'] for m in monthly_data], color='#df1b41', marker='.', linewidth=1.5, label='Outflows')
    ax.plot(x, ma, color='#ff9800', marker='o', linewidth=2, label='3-Month MA')

    ax.set_xticks(x)
    ax.set_xticklabels(months, rotation=45)
    ax.set_ylabel('Revenue (EUR)')
    ax.legend()
    plt.tight_layout()
    return _png(fig)


def generate_client_chart(client_analysis):
    top, top3 = client_analysis.get('top_client_share'), client_analysis.get('top_3_share')
    if top is None or top3 is None:
        return None
    sizes = [top, max(top3 - top, 0), max(100 - top3, 0)]
    labels = ['Top Client', 'Clients 2-3', 'Other Clients']
    colors = ['#0570de', '#4fc3f7', '#e0e0e0']

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
    ax.axis('equal')
    return _png(fig)


@router.get("/pl-statement")
async def get_pl_statement(
    months: int = Query(12, ge=1, le=60),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _statement_for(current_user, db, months)


@router.get("/pl-statement/pdf")
async def get_pl_statement_pdf(
    months: int = Query(12, ge=1, le=60),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await _statement_for(current_user, db, months)

    env = Environment(loader=FileSystemLoader('app/templates'))
    html_out = env.get_template('pl_statement_template.html').render(
        data=data,
        rev_chart_b64=generate_revenue_chart(data['revenue']['monthly']),
        client_chart_b64=generate_client_chart(data['client_analysis']),
    )
    pdf = HTML(string=html_out).write_pdf()

    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=pl_statement.pdf"
    })
