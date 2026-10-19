"""add_occ_version_columns

Revision ID: bde7cc0958ba
Revises: f6fbd54dd3e4
Create Date: 2026-10-16 00:06:34.429529

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bde7cc0958ba'
down_revision: Union[str, None] = 'f6fbd54dd3e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cases', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('billing', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('document', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('document', 'version')
    op.drop_column('billing', 'version')
    op.drop_column('cases', 'version')
