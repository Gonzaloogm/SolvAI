import os
import asyncio
from dotenv import load_dotenv

load_dotenv(".env")
from app.services.stripe_service import fetch_stripe_metrics
from app.services.gemini_service import generate_solvency_report

async def main():
    print("Fetching Stripe metrics...")
    metrics = fetch_stripe_metrics()
    print("Stripe metrics:", metrics)
    
    financial_summary = {
        "data_source_count": 1,
        "connected_platforms": ["STRIPE"],
        "avg_monthly_revenue": metrics["avg_monthly"],
        "currency": "EUR",
        "analysis_period_months": 12,
        "mock_data": False,
        "platform_breakdown": {
            "STRIPE": {
                "avg_monthly": metrics["avg_monthly"],
                "status": metrics["status"],
                "data_points": metrics["data_points"],
                "recent_transactions": metrics.get("transactions_sample", [])
            }
        },
        "monthly_revenue_series": metrics.get("monthly_revenue", []),
        "computed_growth_trend": metrics.get("growth_trend_signal", "Stable"),
        "computed_seasonality_signal": metrics.get("seasonality_signal", "No significant seasonality"),
        "client_concentration": metrics.get("client_concentration", None)
    }
    
    print("Generating report via Gemini...")
    try:
        from app.services.gemini_service import _get_model, _SYSTEM_PROMPT, _build_user_prompt
        model = _get_model()
        prompt = _build_user_prompt(financial_summary)
        response = model.generate_content(
            f"{_SYSTEM_PROMPT}\n\n{prompt}",
            generation_config={"temperature": 0.2, "max_output_tokens": 8192}
        )
        print("Finish Reason:", response.candidates[0].finish_reason)
        print("Raw text:", response.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
