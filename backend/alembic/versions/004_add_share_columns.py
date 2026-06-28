"""Add public share link columns to solvency_reports

Revision ID: 004_share_columns
Revises: 003_score_history
Create Date: 2026-06-28
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = '004_share_columns'
down_revision = '003_score_history'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'solvency_reports',
        sa.Column('share_token', sa.Text(), nullable=True)
    )
    op.add_column(
        'solvency_reports',
        sa.Column('share_enabled', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'solvency_reports',
        sa.Column('share_expires_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        'ix_solvency_reports_share_token',
        'solvency_reports',
        ['share_token'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index('ix_solvency_reports_share_token', table_name='solvency_reports')
    op.drop_column('solvency_reports', 'share_expires_at')
    op.drop_column('solvency_reports', 'share_enabled')
    op.drop_column('solvency_reports', 'share_token')
