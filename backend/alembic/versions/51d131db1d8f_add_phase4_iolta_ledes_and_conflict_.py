"""add_phase4_iolta_ledes_and_conflict_tables

Revision ID: 51d131db1d8f
Revises: 72f45f4f06fd
Create Date: 2026-10-16 00:56:59.375563

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51d131db1d8f'
down_revision: Union[str, None] = '72f45f4f06fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create trust_account table
    op.create_table(
        'trust_account',
        sa.Column('account_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('account_number', sa.String(50), nullable=False),
        sa.Column('account_name', sa.String(100), nullable=False),
        sa.Column('account_type', sa.String(50), nullable=False),  # 'IOLTA_TRUST', 'OPERATING'
        sa.Column('bank_name', sa.String(100), nullable=False),
        sa.Column('current_balance', sa.Numeric(14, 2), nullable=False, server_default='0.00'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('account_id'),
        sa.UniqueConstraint('account_number')
    )

    # 2. Create trust_transaction table
    op.create_table(
        'trust_transaction',
        sa.Column('transaction_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=True),
        sa.Column('case_id', sa.Integer(), nullable=True),
        sa.Column('transaction_type', sa.String(50), nullable=False),  # 'DEPOSIT', 'DISBURSEMENT', 'EARNED_FEE_TRANSFER'
        sa.Column('amount', sa.Numeric(14, 2), nullable=False),
        sa.Column('running_balance', sa.Numeric(14, 2), nullable=False),
        sa.Column('client_running_balance', sa.Numeric(14, 2), nullable=False, server_default='0.00'),
        sa.Column('reference_number', sa.String(100), nullable=True),
        sa.Column('payee_or_payor', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cleared', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['trust_account.account_id']),
        sa.ForeignKeyConstraint(['client_id'], ['client.client_id']),
        sa.ForeignKeyConstraint(['case_id'], ['cases.case_id']),
        sa.ForeignKeyConstraint(['created_by'], ['employee.employee_id']),
        sa.PrimaryKeyConstraint('transaction_id')
    )

    # 3. Create three_way_reconciliation table
    op.create_table(
        'three_way_reconciliation',
        sa.Column('reconciliation_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('statement_date', sa.Date(), nullable=False),
        sa.Column('bank_statement_balance', sa.Numeric(14, 2), nullable=False),
        sa.Column('general_ledger_balance', sa.Numeric(14, 2), nullable=False),
        sa.Column('client_ledger_balance', sa.Numeric(14, 2), nullable=False),
        sa.Column('variance', sa.Numeric(14, 2), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),  # 'BALANCED', 'DISCREPANCY'
        sa.Column('reconciled_by', sa.Integer(), nullable=False),
        sa.Column('reconciled_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['trust_account.account_id']),
        sa.ForeignKeyConstraint(['reconciled_by'], ['employee.employee_id']),
        sa.PrimaryKeyConstraint('reconciliation_id')
    )

    # 4. Add UTBMS and LEDES columns to time_log
    op.add_column('time_log', sa.Column('log_date', sa.Date(), nullable=True))
    op.add_column('time_log', sa.Column('rate_per_hour', sa.Numeric(10, 2), nullable=True, server_default='350.00'))
    op.add_column('time_log', sa.Column('task_code', sa.String(20), nullable=True))
    op.add_column('time_log', sa.Column('activity_code', sa.String(20), nullable=True))
    op.add_column('time_log', sa.Column('expense_code', sa.String(20), nullable=True))
    op.add_column('time_log', sa.Column('line_item_type', sa.String(10), nullable=False, server_default='F'))
    op.add_column('time_log', sa.Column('adjustment_amount', sa.Numeric(10, 2), nullable=False, server_default='0.00'))

    # 5. Add opposing_party and opposing_counsel to cases
    op.add_column('cases', sa.Column('opposing_party', sa.String(200), nullable=True))
    op.add_column('cases', sa.Column('opposing_counsel', sa.String(200), nullable=True))

    # 6. Create case_adverse_party table
    op.create_table(
        'case_adverse_party',
        sa.Column('party_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('party_name', sa.String(200), nullable=False),
        sa.Column('party_type', sa.String(50), nullable=False),  # 'OPPOSING_PARTY', 'CO_DEFENDANT', 'KEY_WITNESS', 'AFFILIATE'
        sa.Column('corporate_affiliate', sa.String(200), nullable=True),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['cases.case_id']),
        sa.PrimaryKeyConstraint('party_id')
    )


def downgrade() -> None:
    op.drop_table('case_adverse_party')
    op.drop_column('cases', 'opposing_counsel')
    op.drop_column('cases', 'opposing_party')
    op.drop_column('time_log', 'adjustment_amount')
    op.drop_column('time_log', 'line_item_type')
    op.drop_column('time_log', 'expense_code')
    op.drop_column('time_log', 'activity_code')
    op.drop_column('time_log', 'task_code')
    op.drop_column('time_log', 'rate_per_hour')
    op.drop_column('time_log', 'log_date')
    op.drop_table('three_way_reconciliation')
    op.drop_table('trust_transaction')
    op.drop_table('trust_account')
