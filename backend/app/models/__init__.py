"""
SolvAI ORM models – import all models here so SQLAlchemy's mapper
and Alembic's autogenerate can discover every table.
"""
from app.models.organization import Organization
from app.models.user import User
from app.models.financial_data_source import FinancialDataSource
from app.models.solvency_report import SolvencyReport
from app.models.lender_profile import LenderManifest
from app.models.alert import Alert
from app.models.api_key import ApiKey
from app.models.verification_request import VerificationRequest
from app.models.promo_code import PromoCode

__all__ = [
    "Organization",
    "User",
    "FinancialDataSource",
    "SolvencyReport",
    "LenderManifest",
    "Alert",
    "ApiKey",
    "VerificationRequest",
    "PromoCode",
]
