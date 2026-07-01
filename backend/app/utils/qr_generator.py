import qrcode
from io import BytesIO
import base64
import os

def generate_qr_base64(url: str, size: int = 150) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    if hasattr(img, 'resize'):
        img = img.resize((size, size))
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"

def generate_verification_url(report_id: str, token: str = None) -> str:
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    if token:
        return f"{frontend_url}/r/{token}"
    return f"{frontend_url}/verify/{report_id}"
