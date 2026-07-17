"""merge_heads

Revision ID: 6a53eeb51a33
Revises: 008_freemium_unlocked_reports, seed_promo_01
Create Date: 2026-07-07 12:51:28.159237

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a53eeb51a33'
down_revision: Union[str, None] = ('008_freemium_unlocked_reports', 'seed_promo_01')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
