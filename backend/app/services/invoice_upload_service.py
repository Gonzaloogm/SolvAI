from __future__ import annotations

import csv
import io
import re
from typing import Any

from loguru import logger


# ── Regex helpers ─────────────────────────────────────────────────────────────
_DATE_PATTERN = re.compile(
    r"\d{2}[/\-\.]\d{2}[/\-\.]\d{2,4}"   # DD/MM/YYYY or DD-MM-YY
    r"|\d{4}[\-\.]\d{2}[\-\.]\d{2}"       # YYYY-MM-DD
)
_AMOUNT_PATTERN = re.compile(
    r"[€$£¥]?\s*([\d]{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?)\s*[€$£¥]?"
)


def _clean_amount(raw: str) -> float | None:
    """Parse a locale-formatted amount string to a Python float.

    Handles European (1.234,56) and US (1,234.56) formats as well as plain
    decimal strings.  Returns *None* if parsing fails.
    """
    # Remove currency symbols and whitespace
    raw = raw.strip().strip("€$£¥ \t")
    if not raw:
        return None

    # Determine decimal separator: last . or , before digits
    if "," in raw and "." in raw:
        # Both present — last one is the decimal separator
        last_comma = raw.rfind(",")
        last_dot = raw.rfind(".")
        if last_comma > last_dot:
            # European: 1.234,56
            raw = raw.replace(".", "").replace(",", ".")
        else:
            # US: 1,234.56
            raw = raw.replace(",", "")
    elif "," in raw:
        # Could be decimal comma (European) or thousands (US)
        parts = raw.split(",")
        if len(parts) == 2 and len(parts[1]) <= 2:
            # Decimal comma
            raw = raw.replace(",", ".")
        else:
            # Thousands separator
            raw = raw.replace(",", "")

    try:
        return float(raw)
    except ValueError:
        return None


class InvoiceUploadService:
    """Parse uploaded CSV or PDF invoice files into normalized transaction dicts.

    Returned transactions are **not** persisted automatically — the endpoint
    returns them for user review before a separate confirmation step saves them.
    """

    # ── CSV ───────────────────────────────────────────────────────────────────

    def parse_csv(self, content: bytes) -> list[dict[str, Any]]:
        """Parse a CSV file into a list of income transactions.

        Supports multi-language column headers (EN/ES/FR) and handles
        BOM-encoded files from Excel exports.

        Expected columns (any casing, aliases accepted):
          - ``date`` / ``fecha`` / ``date_issued``
          - ``amount`` / ``importe`` / ``total``
          - ``currency`` / ``moneda`` / ``devise``
          - ``client`` / ``customer`` / ``cliente`` / ``contact``

        Only rows with a positive amount are returned.
        """
        decoded = content.decode("utf-8-sig")  # Handle UTF-8 BOM from Excel
        reader = csv.DictReader(io.StringIO(decoded))
        transactions: list[dict[str, Any]] = []

        for row_index, row in enumerate(reader, start=2):  # Row 1 = header
            # Normalize keys to lowercase stripped strings
            normalized: dict[str, str] = {
                k.lower().strip(): (v or "").strip()
                for k, v in row.items()
                if k is not None
            }

            # ── Date ──────────────────────────────────────────────────────────
            date = (
                normalized.get("date")
                or normalized.get("fecha")
                or normalized.get("date_issued")
                or normalized.get("invoice_date")
                or ""
            )

            # ── Amount ────────────────────────────────────────────────────────
            raw_amount = (
                normalized.get("amount")
                or normalized.get("importe")
                or normalized.get("total")
                or normalized.get("montant")
                or "0"
            )
            amount = _clean_amount(raw_amount)
            if amount is None:
                logger.warning(
                    f"CSV row {row_index}: could not parse amount '{raw_amount}', skipping"
                )
                continue
            if amount <= 0:
                continue  # Skip expenses / zero rows

            # ── Currency ──────────────────────────────────────────────────────
            currency = (
                normalized.get("currency")
                or normalized.get("moneda")
                or normalized.get("devise")
                or normalized.get("currency_code")
                or "EUR"
            ).upper()[:3]

            # ── Client ────────────────────────────────────────────────────────
            client = (
                normalized.get("client")
                or normalized.get("customer")
                or normalized.get("cliente")
                or normalized.get("contact")
                or normalized.get("customer_name")
                or "Unknown"
            )

            if not date:
                logger.debug(f"CSV row {row_index}: no date found, including with empty date")

            transactions.append(
                {
                    "date": date,
                    "amount": amount,
                    "currency": currency,
                    "client": client,
                    "source": "MANUAL_UPLOAD",
                }
            )

        logger.info(f"CSV parsed: {len(transactions)} income transactions extracted")
        return transactions

    # ── PDF ───────────────────────────────────────────────────────────────────

    def parse_pdf(self, content: bytes) -> list[dict[str, Any]]:
        """Attempt to extract invoice data from a PDF using pdfplumber.

        Strategy:
        1. Try table extraction on every page — structured data wins.
        2. If no structured tables are found, fall back to a heuristic
           text-scan that looks for amount + date patterns on each page.
        3. If nothing is found, return a single placeholder row flagged with
           ``needs_review: True`` so the front-end can prompt the user.

        Raises:
            RuntimeError: If pdfplumber is not installed or the PDF is corrupt.
        """
        try:
            import pdfplumber  # type: ignore[import-untyped]
        except ImportError:
            raise RuntimeError(
                "pdfplumber is not installed. "
                "Run `pip install pdfplumber>=0.11.0` to enable PDF invoice parsing."
            )

        transactions: list[dict[str, Any]] = []

        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page_num, page in enumerate(pdf.pages, start=1):
                    # ── 1. Table extraction ───────────────────────────────────
                    tables = page.extract_tables() or []
                    for table in tables:
                        for row in table:
                            if not row:
                                continue
                            parsed = self._try_parse_table_row(row)
                            if parsed:
                                transactions.append(parsed)

                    if not transactions:
                        # ── 2. Text-scan fallback ─────────────────────────────
                        text = page.extract_text() or ""
                        text_txns = self._scan_text_for_amounts(text, page_num)
                        transactions.extend(text_txns)

        except RuntimeError:
            raise
        except Exception as exc:
            logger.error(f"PDF parse error: {exc}")
            raise RuntimeError(f"Could not parse PDF: {exc}") from exc

        if not transactions:
            # ── 3. Nothing found — return review placeholder ──────────────────
            logger.warning("PDF parsing found no structured data; returning review placeholder")
            return [
                {
                    "date": "",
                    "amount": 0.0,
                    "currency": "EUR",
                    "client": "PDF extracted — please review",
                    "source": "MANUAL_UPLOAD",
                    "needs_review": True,
                }
            ]

        logger.info(f"PDF parsed: {len(transactions)} transactions extracted")
        return transactions

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _try_parse_table_row(self, row: list[Any]) -> dict[str, Any] | None:
        """Try to extract a (date, amount) pair from a table row.

        Returns a transaction dict or *None* if the row does not look like an
        invoice line item.
        """
        cells = [str(c or "").strip() for c in row]

        found_date: str | None = None
        found_amount: float | None = None

        for cell in cells:
            if not cell:
                continue

            if found_date is None:
                dm = _DATE_PATTERN.search(cell)
                if dm:
                    found_date = dm.group(0)

            if found_amount is None:
                am = _AMOUNT_PATTERN.search(cell)
                if am:
                    val = _clean_amount(am.group(1))
                    if val is not None and val > 0:
                        found_amount = val

        if found_date and found_amount:
            return {
                "date": found_date,
                "amount": found_amount,
                "currency": "EUR",
                "client": "PDF Invoice",
                "source": "MANUAL_UPLOAD",
            }
        return None

    def _scan_text_for_amounts(
        self,
        text: str,
        page_num: int,
    ) -> list[dict[str, Any]]:
        """Heuristic text scan — find amounts + nearby dates in raw page text.

        This is a best-effort fallback for non-tabular PDFs.
        """
        results: list[dict[str, Any]] = []
        lines = text.splitlines()

        for line in lines:
            date_match = _DATE_PATTERN.search(line)
            amount_match = _AMOUNT_PATTERN.search(line)

            if date_match and amount_match:
                val = _clean_amount(amount_match.group(1))
                if val is not None and val > 0:
                    results.append(
                        {
                            "date": date_match.group(0),
                            "amount": val,
                            "currency": "EUR",
                            "client": f"PDF Invoice (p{page_num})",
                            "source": "MANUAL_UPLOAD",
                        }
                    )

        return results


# Module-level singleton
invoice_upload_service = InvoiceUploadService()
