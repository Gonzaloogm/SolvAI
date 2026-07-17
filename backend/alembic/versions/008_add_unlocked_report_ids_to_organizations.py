"""Add unlocked_report_ids to organizations (freemium paywall)

Adds a JSONB column ``unlocked_report_ids`` to the ``organizations`` table.
This column stores a list of report UUID strings that have been individually
unlocked via a one-time 9€ Stripe payment. Pro subscribers (plan='pro') bypass
this list entirely and always have download access.

Revision ID: 008_freemium_unlocked_reports
Revises: 511c57a63106
Create Date: 2026-07-06

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "008_freemium_unlocked_reports"
down_revision: Union[str, None] = "511c57a63106"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "unlocked_report_ids",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
            comment="Array of report UUID strings unlocked via one-time 9€ purchase",
        ),
    )


def downgrade() -> None:
    op.drop_column("organizations", "unlocked_report_ids")
