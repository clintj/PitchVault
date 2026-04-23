"""add ip_address to viewer_sessions

Revision ID: 6f8a2e9c1b4d
Revises: 5c17d690afc2
Create Date: 2026-04-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '6f8a2e9c1b4d'
down_revision = '5c17d690afc2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('viewer_sessions', sa.Column('ip_address', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('viewer_sessions', 'ip_address')
