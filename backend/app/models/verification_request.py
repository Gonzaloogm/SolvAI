import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String, unique=True, nullable=False, index=True)
    applicant_email = Column(String, nullable=False)
    requester_name = Column(String, nullable=False)
    requester_company = Column(String, nullable=False)
    requester_email = Column(String, nullable=False)
    property_address = Column(String, nullable=True)
    monthly_rent = Column(Float, nullable=True)
    status = Column(String, default="PENDING_APPLICANT")
    report_id = Column(UUID(as_uuid=True), ForeignKey("solvency_reports.id"), nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
