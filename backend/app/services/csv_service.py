import csv
import io
import re
import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

DATE_COLUMNS = [
    "date", "fecha", "datum", "data", "date opération",
    "transaction date", "value date", "booking date",
    "fecha operación", "fecha valor", "transaction_date",
    "value_date", "booking_date", "wertstellung",
    "buchungsdatum", "operation date", "posting date",
]
AMOUNT_COLUMNS = [
    "amount", "importe", "betrag", "montant", "credit",
    "credito", "avoir", "income", "ingreso", "credit amount",
    "amount credit", "transaction amount", "value", "sum",
    "total", "eingänge", "gutschrift", "crédit",
    "amount (eur)", "amount (gbp)", "valor", "debit",
]
DESCRIPTION_COLUMNS = [
    "description", "concepto", "betreff", "libellé",
    "details", "reference", "memo", "narrative",
    "transaction", "concept", "detalles", "motivo",
    "verwendungszweck", "buchungstext", "descripción",
    "client",
]


def _normalize(col: str) -> str:
    return col.lower().strip().replace(" ", "_")


def _find_col(columns: list, candidates: list) -> Optional[str]:
    norm = {_normalize(c): c for c in columns}
    for cand in candidates:
        n = _normalize(cand)
        if n in norm:
            return norm[n]
        for key, orig in norm.items():
            if n in key or key in n:
                return orig
    return None


def _parse_amount(value) -> Optional[float]:
    if value is None:
        return None
    s = re.sub(r'[€$£¥\s]', '', str(value).strip())
    if not s:
        return None
    # European format: 1.234,56
    if re.match(r'^-?\d{1,3}(\.\d{3})*(,\d+)?$', s):
        s = s.replace('.', '').replace(',', '.')
    # US format: 1,234.56
    elif re.match(r'^-?\d{1,3}(,\d{3})*(\.\d+)?$', s):
        s = s.replace(',', '')
    else:
        s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def _parse_date(value) -> Optional[datetime.datetime]:
    if value is None:
        return None
    s = str(value).strip()
    for fmt in [
        "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y",
        "%m/%d/%Y", "%d.%m.%Y", "%Y/%m/%d",
        "%d/%m/%y", "%d-%m-%y", "%Y%m%d",
    ]:
        try:
            return datetime.datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


class CSVService:
    def parse_file(self, content: bytes, filename: str = "") -> dict:
        """
        Parse a bank statement CSV.
        Returns preview + monthly_revenue_series.
        """
        # Decode
        text = None
        for enc in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                text = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if not text:
            raise ValueError("Could not decode file")

        # Detect delimiter
        try:
            dialect = csv.Sniffer().sniff(
                text[:2000], delimiters=',;|\t'
            )
            delimiter = dialect.delimiter
        except csv.Error:
            delimiter = ','

        # Find header row (skip bank metadata rows)
        lines = text.split('\n')
        header_row = 0
        for i, line in enumerate(lines[:10]):
            if any(
                c in line.lower()
                for c in DATE_COLUMNS[:5]
            ):
                header_row = i
                break

        # Parse
        try:
            reader = csv.reader(
                lines[header_row:],
                delimiter=delimiter,
            )
            header = next(reader)
        except (StopIteration, csv.Error) as e:
            raise ValueError(f"Could not parse CSV: {e}")

        header = [str(c).strip() for c in header]

        # Find columns
        date_col = _find_col(header, DATE_COLUMNS)
        amount_col = _find_col(header, AMOUNT_COLUMNS)
        desc_col = _find_col(header, DESCRIPTION_COLUMNS)

        if not date_col:
            raise ValueError(
                f"Could not find date column. "
                f"Headers: {header[:8]}"
            )
        if not amount_col:
            raise ValueError(
                f"Could not find amount column. "
                f"Headers: {header[:8]}"
            )

        date_idx = header.index(date_col)
        amount_idx = header.index(amount_col)
        desc_idx = header.index(desc_col) if desc_col else None

        # Aggregate monthly income
        monthly: dict = {}
        preview: list = []
        income_count = 0
        total_row_count = 0

        for row in reader:
            if not row or len(row) <= max(date_idx, amount_idx):
                continue

            date = _parse_date(row[date_idx])
            amount = _parse_amount(row[amount_idx])
            desc = str(row[desc_idx]).strip() if desc_idx is not None and len(row) > desc_idx else ''

            if not date or amount is None:
                continue

            total_row_count += 1

            if amount <= 0:
                continue  # skip outflows

            income_count += 1
            key = date.strftime("%Y-%m")

            if key not in monthly:
                monthly[key] = {
                    "month": key,
                    "revenue": 0.0,
                    "transactions": 0,
                }
            monthly[key]["revenue"] += amount
            monthly[key]["transactions"] += 1

            if len(preview) < 10:
                preview.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "amount": round(amount, 2),
                    "description": desc[:80],
                })

        sorted_months = sorted(
            monthly.values(),
            key=lambda x: x["month"]
        )
        total = sum(m["revenue"] for m in sorted_months)

        date_range = None
        if sorted_months:
            date_range = [
                sorted_months[0]["month"],
                sorted_months[-1]["month"],
            ]

        return {
            "preview": preview,
            "monthly_revenue_series": sorted_months,
            "detected_columns": {
                "date": date_col,
                "amount": amount_col,
                "description": desc_col,
            },
            "total_rows": total_row_count,
            "income_rows": income_count,
            "date_range": date_range,
            "total_income": round(total, 2),
            "currency": "EUR",
        }
