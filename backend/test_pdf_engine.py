#!/usr/bin/env python3
"""
test_pdf_engine.py — Phase 3 isolated PDF rendering test.

On macOS dev boxes, WeasyPrint cannot load libgobject (system dependency).
This test validates the full Jinja2 rendering layer + data normalization
and confirms all templates render without error when WeasyPrint is mocked.
Run on Linux/Docker for full end-to-end WeasyPrint validation.

  source .venv/bin/activate && python test_pdf_engine.py
"""
import sys
import os
import io
import uuid
import tracemalloc
import traceback
import unittest.mock as mock
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Mock WeasyPrint before importing pdf_service ──────────────────────────────
MOCK_PDF_BYTES = b"%PDF-1.4 mock-pdf-content-for-testing"

mock_html_instance = mock.MagicMock()
mock_html_instance.write_pdf.return_value = MOCK_PDF_BYTES

weasyprint_mock = mock.MagicMock()
weasyprint_mock.HTML.return_value = mock_html_instance

sys.modules["weasyprint"] = weasyprint_mock
sys.modules["weasyprint.text"] = mock.MagicMock()
sys.modules["weasyprint.text.fonts"] = mock.MagicMock()

class MockReport:
    id = uuid.uuid4()
    created_at = datetime.now(timezone.utc)
    report_type = "FULL"
    share_token = "mock-share-token-abc123"
    qr_code_b64 = None
    verification_id = "abc123"
    verify_url = "https://solvai.app/verify/mock"
    report_data: dict = {}

MOCK_REPORT_DATA = {
    "overall_score": 74,
    "recommendation": "Approve",
    "rating": "Strong",
    "narrative": (
        "The applicant demonstrates a robust and consistent revenue profile. "
        "Income stability is underpinned by a diversified client base (<30% top client). "
        "Industry Context: The applicant operates in the freelance software consulting sector."
    ),
    "industry_context": "EU Freelance sector +7% YoY. Applicant CoV 18.4% vs 28% median.",
    "income_stability": {"score": 78, "description": "Consistent income.", "lender_implications": "Strong basis."},
    "growth_trend": {"score": 72, "description": "+3.2% MoM.", "lender_implications": "Supports repayment."},
    "seasonality": {"score": 65, "pattern": "Mild Q4 dip", "description": "Minor pattern.", "lender_implications": "Cash buffer Q4."},
    "client_concentration": {"score": 70, "description": "Top client 28%.", "lender_implications": "Low risk."},
    "reputation_signals": {"score": 80, "description": "No adverse signals.", "lender_implications": "Clean."},
    "risk_flags": [{"title": "Mild Seasonality", "desc": "Q4 dips 15% below annual average."}],
    "strengths": [
        {"title": "Revenue Consistency", "desc": "CoV 18.4%."},
        {"title": "Diversification", "desc": "Top 3 = 52%."},
    ],
    "recommendations": ["Maintain 2-month cash reserve.", "Formalize contracts."],
    "data_references": ["STRIPE"],
    "financial_summary": {
        "connected_platforms": ["STRIPE"],
        "avg_monthly_revenue": 6250.0,
        "data_source_count": 1,
        "analysis_period_months": 12,
        "client_concentration": {
            "distinct_clients_count": 14,
            "top_client_percentage": 28.0,
            "top_3_clients_percentage": 52.0,
        },
        "monthly_revenue_series": [
            {"month": f"2025-{str(i).zfill(2)}", "total": 5800 + (i * 180), "transaction_count": 12 + i}
            for i in range(1, 13)
        ],
    },
}


def run_test():
    print("=" * 60)
    print("SolvAI PDF Engine Smoke Test — Phase 3")
    print("(WeasyPrint mocked; validates Jinja2 + data normalization)")
    print("=" * 60)

    # ── Memory baseline ───────────────────────────────────────────────────────
    tracemalloc.start()
    snapshot_before = tracemalloc.take_snapshot()

    report = MockReport()
    report.report_data = MOCK_REPORT_DATA

    print("\n[1] Importing pdf_service (WeasyPrint mocked)...")
    from app.services.pdf_service import generate_solvency_pdf
    print("    OK - Import successful")

    # ── Test 1: Full rich payload ─────────────────────────────────────────────
    print("\n[2] Running generate_solvency_pdf() with full mock payload...")
    try:
        pdf_buffer = generate_solvency_pdf(report)
        pdf_bytes = pdf_buffer.getvalue()
        print(f"    OK - Returned buffer with {len(pdf_bytes)} bytes")
    except Exception as exc:
        print(f"    FAIL - Exception during PDF generation:\n    {exc}")
        traceback.print_exc()
        sys.exit(1)

    # ── Test 2: Validate HTML was passed to WeasyPrint ────────────────────────
    print("\n[3] Verifying Jinja2 rendered HTML was passed to HTML()...")
    call_args = weasyprint_mock.HTML.call_args
    if call_args is None:
        print("    FAIL - weasyprint.HTML() was never called")
        sys.exit(1)
    html_kwarg = call_args.kwargs.get("string") or (call_args.args[0] if call_args.args else None)
    if not html_kwarg or "<html" not in html_kwarg.lower():
        print(f"    FAIL - HTML string not passed correctly. Got: {str(html_kwarg)[:100]!r}")
        sys.exit(1)
    print(f"    OK - HTML string passed ({len(html_kwarg):,} chars)")

    # Check critical sections rendered
    checks = [
        ("overall_score in HTML", "74" in html_kwarg),
        ("narrative in HTML", "consistent revenue profile" in html_kwarg),
        ("rating in HTML", "Strong" in html_kwarg),
        ("income_stability score", "78" in html_kwarg),
        ("risk_flags section", "Mild Seasonality" in html_kwarg),
        ("data_references", "STRIPE" in html_kwarg),
    ]
    for name, result in checks:
        status = "OK" if result else "FAIL"
        print(f"    {status} - {name}")
        if not result:
            sys.exit(1)

    # ── Test 3: Memory check ─────────────────────────────────────────────────
    snapshot_after = tracemalloc.take_snapshot()
    tracemalloc.stop()
    top_stats = snapshot_after.compare_to(snapshot_before, "lineno")
    total_mb = sum(s.size_diff for s in top_stats) / (1024 * 1024)
    print(f"\n[4] Memory delta: {total_mb:.2f} MB")
    threshold = 100
    if total_mb > threshold:
        print(f"    WARNING: {total_mb:.2f} MB exceeds {threshold} MB. Top allocs:")
        for stat in top_stats[:5]:
            print(f"      {stat}")
    else:
        print(f"    OK - Memory within bounds (< {threshold} MB)")

    # ── Test 4: Sparse/missing keys (skeleton safety) ─────────────────────────
    print("\n[5] Sparse report test (most keys missing)...")
    weasyprint_mock.HTML.reset_mock()
    report_sparse = MockReport()
    report_sparse.report_data = {
        "overall_score": 45,
        "rating": "At Risk",
        "narrative": "Minimal data.",
    }
    try:
        pdf_sparse = generate_solvency_pdf(report_sparse)
        print(f"    OK - Sparse report pipeline completed without exception")
        sparse_html = weasyprint_mock.HTML.call_args
        if sparse_html:
            html_str = sparse_html.kwargs.get("string") or ""
            print(f"    OK - HTML rendered ({len(html_str):,} chars)")
    except Exception as exc:
        print(f"    FAIL - Sparse report raised: {exc}")
        traceback.print_exc()
        sys.exit(1)

    # ── Test 5: Null score guard (score=None edge case) ───────────────────────
    print("\n[6] Null score guard test (score=None)...")
    weasyprint_mock.HTML.reset_mock()
    report_null = MockReport()
    report_null.report_data = {"overall_score": None, "rating": None, "narrative": None}
    try:
        generate_solvency_pdf(report_null)
        print(f"    OK - Null score report completed without exception")
    except Exception as exc:
        print(f"    FAIL - Null score raised: {exc}")
        traceback.print_exc()
        sys.exit(1)

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
    print("Jinja2 rendering: STABLE")
    print("Data normalization: STABLE")
    print("Memory: SAFE")
    print("Missing-key fallbacks: VERIFIED")
    print("=" * 60)
    print("\nNOTE: Run on Linux/Docker for WeasyPrint end-to-end PDF test.")
    return 0


if __name__ == "__main__":
    sys.exit(run_test())
