"""Add report_type to solvency_reports

Revision ID: 005_report_type
Revises: 004_share_columns
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = '005_report_type'
down_revision = '004_share_columns' # verify this in the versions folder
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add column with default 'FULL'
    op.add_column(
        'solvency_reports',
        sa.Column('report_type', sa.String(20), server_default='FULL', nullable=False)
    )

def downgrade() -> None:
    op.drop_column('solvency_reports', 'report_type')
