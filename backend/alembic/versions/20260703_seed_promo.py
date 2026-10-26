"""seed promo

Revision ID: seed_promo_01
Revises: 
Create Date: 2026-07-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'seed_promo_01'
down_revision: Union[str, None] = 'ad8648d7a0d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    INSERT INTO promo_codes (id, code, plan, max_uses, is_active, uses_count)
    VALUES
      (gen_random_uuid(), 'SOLVAI-FOUNDER', 'pro', 100, true, 0),
      (gen_random_uuid(), 'HACKATHON2026', 'pro', 50, true, 0),
      (gen_random_uuid(), 'BETA-ACCESS', 'pro', 25, true, 0),
      (gen_random_uuid(), 'LANDLORD-PRO', 'pro', 20, true, 0),
      (gen_random_uuid(), 'GESTOR-PRO', 'pro', 20, true, 0)
    ON CONFLICT (code) DO UPDATE 
      SET is_active = true, 
          uses_count = 0,
          max_uses = EXCLUDED.max_uses;
    """)


def downgrade() -> None:
    op.execute("""
    DELETE FROM promo_codes WHERE code IN ('SOLVAI-FOUNDER', 'HACKATHON2026', 'BETA-ACCESS', 'LANDLORD-PRO', 'GESTOR-PRO');
    """)
