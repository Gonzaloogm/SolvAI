"""Add score history columns to solvency_reports

Revision ID: 003_score_history
Revises: 511c57a63106
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_score_history'
down_revision = '511c57a63106'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'solvency_reports',
        sa.Column('overall_score', sa.Integer(), nullable=True)
    )
    op.add_column(
        'solvency_reports',
        sa.Column('rating', sa.Text(), nullable=True)
    )
    op.add_column(
        'solvency_reports',
        sa.Column('generated_month', sa.Text(), nullable=True,
                  comment='Format: YYYY-MM, e.g. 2026-06')
    )
    op.create_index(
        'ix_solvency_reports_generated_month',
        'solvency_reports',
        ['generated_month']
    )


def downgrade() -> None:
    op.drop_index('ix_solvency_reports_generated_month', table_name='solvency_reports')
    op.drop_column('solvency_reports', 'generated_month')
    op.drop_column('solvency_reports', 'rating')
    op.drop_column('solvency_reports', 'overall_score')
