import csv
import io
import datetime
import re

DATE_COLUMNS = ['date', 'fecha', 'data', 'posting date', 'transaction date']
AMOUNT_COLUMNS = ['amount', 'importe', 'valor', 'credit', 'debit', 'transaction amount']
DESCRIPTION_COLUMNS = ['description', 'descripción', 'concepto', 'details', 'concept']

class CSVService:
    def parse_file(self, content: bytes):
        try:
            text = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                text = content.decode('latin1')
            except Exception:
                raise ValueError("Could not decode file content")
                
        try:
            text_stream = io.StringIO(text)
            # Try comma first
            reader = csv.reader(text_stream)
            header = next(reader)
            if len(header) == 1 and ';' in header[0]:
                text_stream.seek(0)
                reader = csv.reader(text_stream, delimiter=';')
                header = next(reader)
        except StopIteration:
            raise ValueError("CSV file is empty")
        except Exception:
            raise ValueError("Could not parse CSV file")

        header = [str(c).strip().lower() for c in header]
        
        date_col_idx = next((i for i, c in enumerate(header) if c in DATE_COLUMNS), None)
        amount_col_idx = next((i for i, c in enumerate(header) if c in AMOUNT_COLUMNS), None)
        desc_col_idx = next((i for i, c in enumerate(header) if c in DESCRIPTION_COLUMNS), None)

        if date_col_idx is None or amount_col_idx is None:
            raise ValueError("Could not detect required columns (date, amount)")

        transactions = []
        for row in reader:
            if not row or len(row) <= max(date_col_idx, amount_col_idx):
                continue
            
            try:
                date_val = str(row[date_col_idx]).strip()
                amt_str = str(row[amount_col_idx]).strip().replace(',', '')
                amount_val = float(amt_str)
                desc_val = str(row[desc_col_idx]).strip() if desc_col_idx is not None and len(row) > desc_col_idx else "Unknown"
                
                transactions.append({
                    "date": date_val,
                    "amount": amount_val,
                    "client": desc_val,
                    "currency": "EUR"
                })
            except Exception:
                continue

        return transactions
