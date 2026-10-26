"""rename s3_key to document_uri

Revision ID: d0932b171c7d
Revises: cb669bec99c0
Create Date: 2026-07-02 13:51:57.927345

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd0932b171c7d'
down_revision: Union[str, None] = 'cb669bec99c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('solvency_reports', 's3_key', new_column_name='document_uri')


def downgrade() -> None:
    op.alter_column('solvency_reports', 'document_uri', new_column_name='s3_key')
