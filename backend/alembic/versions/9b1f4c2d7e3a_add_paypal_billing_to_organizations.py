"""add PayPal billing fields to organizations

Revision ID: 9b1f4c2d7e3a
Revises: 21996ee8541d
Create Date: 2026-10-26 14:00:00

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b1f4c2d7e3a'
down_revision: Union[str, None] = '21996ee8541d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('billing_provider', sa.Text(), nullable=True))
    op.add_column('organizations', sa.Column('paypal_subscription_id', sa.Text(), nullable=True))
    op.create_index('ix_organizations_paypal_subscription_id', 'organizations', ['paypal_subscription_id'])


def downgrade() -> None:
    op.drop_index('ix_organizations_paypal_subscription_id', table_name='organizations')
    op.drop_column('organizations', 'paypal_subscription_id')
    op.drop_column('organizations', 'billing_provider')
