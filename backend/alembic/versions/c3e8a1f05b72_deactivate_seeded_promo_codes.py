"""Deactivate the promo codes seeded by earlier migrations

They are published in this repository, so anyone could get a paid plan with
them. Codes are now created per deployment with scripts/create_promo_code.py.

Revision ID: c3e8a1f05b72
Revises: 9b1f4c2d7e3a
"""
from alembic import op

revision = "c3e8a1f05b72"
down_revision = "9b1f4c2d7e3a"
branch_labels = None
depends_on = None

SEEDED = "('SOLVAI-FOUNDER', 'HACKATHON2026', 'BETA-ACCESS', 'LANDLORD-PRO', 'GESTOR-PRO')"


def upgrade() -> None:
    op.execute(f"UPDATE promo_codes SET is_active = false WHERE code IN {SEEDED}")


def downgrade() -> None:
    op.execute(f"UPDATE promo_codes SET is_active = true WHERE code IN {SEEDED}")
