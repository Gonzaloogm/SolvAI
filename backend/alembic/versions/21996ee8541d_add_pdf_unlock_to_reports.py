"""add_pdf_unlock_to_reports

Revision ID: 21996ee8541d
Revises: 6a53eeb51a33
Create Date: 2026-07-07 12:51:29.344777

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21996ee8541d'
down_revision: Union[str, None] = '6a53eeb51a33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('solvency_reports', sa.Column('pdf_unlocked', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('solvency_reports', sa.Column('pdf_unlocked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('solvency_reports', sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True))

    op.execute("DELETE FROM solvency_reports WHERE status = 'FAILED' AND overall_score IS NULL AND created_at < NOW() - INTERVAL '24 hours'")
    op.execute("DELETE FROM solvency_reports WHERE status = 'GENERATING' AND created_at < NOW() - INTERVAL '2 hours'")
    op.execute("UPDATE organizations SET plan = 'pro', status = 'active', current_period_end = '2099-12-31'::date WHERE id IN (SELECT organization_id FROM users WHERE email IN ('demo@solvai.com', 'gongarmart@gmail.com'))")
    op.execute("INSERT INTO promo_codes (id, code, plan, max_uses, is_active, uses_count) VALUES (gen_random_uuid(), 'SOLVAI-FOUNDER', 'pro', 100, true, 0), (gen_random_uuid(), 'HACKATHON2026', 'pro', 50, true, 0), (gen_random_uuid(), 'BETA-ACCESS', 'pro', 25, true, 0) ON CONFLICT (code) DO UPDATE SET is_active=true, uses_count=0")

def downgrade() -> None:
    op.drop_column('solvency_reports', 'stripe_payment_intent_id')
    op.drop_column('solvency_reports', 'pdf_unlocked_at')
    op.drop_column('solvency_reports', 'pdf_unlocked')
