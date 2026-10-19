"""add_legal_hold_and_s3_storage_columns

Revision ID: 72f45f4f06fd
Revises: bde7cc0958ba
Create Date: 2026-10-16 00:36:01.986397

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72f45f4f06fd'
down_revision: Union[str, None] = 'bde7cc0958ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cases table: Legal hold & WORM tracking
    op.add_column('cases', sa.Column('legal_hold', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('cases', sa.Column('legal_hold_reason', sa.Text(), nullable=True))
    op.add_column('cases', sa.Column('legal_hold_by', sa.Integer(), nullable=True))
    op.add_column('cases', sa.Column('legal_hold_at', sa.DateTime(), nullable=True))

    # 2. Document table: S3 object storage, AES-256 checksum, OCR extraction
    op.add_column('document', sa.Column('s3_key', sa.String(length=500), nullable=True))
    op.add_column('document', sa.Column('s3_bucket', sa.String(length=100), nullable=True))
    op.add_column('document', sa.Column('sha256_checksum', sa.String(length=64), nullable=True))
    op.add_column('document', sa.Column('encryption_status', sa.String(length=50), nullable=False, server_default='AES-256'))
    op.add_column('document', sa.Column('ocr_status', sa.String(length=50), nullable=False, server_default='Pending'))
    op.add_column('document', sa.Column('extracted_text', sa.Text(), nullable=True))
    op.add_column('document', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('document', sa.Column('file_size_bytes', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column('document', 'file_size_bytes')
    op.drop_column('document', 'is_archived')
    op.drop_column('document', 'extracted_text')
    op.drop_column('document', 'ocr_status')
    op.drop_column('document', 'encryption_status')
    op.drop_column('document', 'sha256_checksum')
    op.drop_column('document', 's3_bucket')
    op.drop_column('document', 's3_key')

    op.drop_column('cases', 'legal_hold_at')
    op.drop_column('cases', 'legal_hold_by')
    op.drop_column('cases', 'legal_hold_reason')
    op.drop_column('cases', 'legal_hold')
