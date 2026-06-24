from pydantic import BaseModel, Field
from typing import List

class StandardizedTransaction(BaseModel):
    transaction_id: str
    amount: float
    description: str = "N/A"

class FinancialSummary(BaseModel):
    avg_monthly_revenue: float
    total_distinct_clients: int
    monthly_revenue_series: List[float]
    # Usaremos esto para asegurar que Gemini siempre reciba el mismo formato