package com.psl.lawfirm.dao;

import com.psl.lawfirm.config.DatabaseConfig;
import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.exception.InsufficientTrustFundsException;
import com.psl.lawfirm.model.TrustAccount;
import com.psl.lawfirm.util.LoggerUtil;

import java.math.BigDecimal;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * Trust Account DAO Implementation with JDBC Transactions
 */
public class TrustAccountDAOImpl implements TrustAccountDAO {
    private static final Logger LOGGER = LoggerUtil.getLogger(TrustAccountDAOImpl.class);

    private TrustAccount mapResultSet(ResultSet rs) throws SQLException {
        TrustAccount acc = new TrustAccount();
        acc.setId(rs.getLong("account_id"));
        acc.setAccountNumber(rs.getString("account_number"));
        acc.setAccountName(rs.getString("account_name"));
        acc.setAccountType(rs.getString("account_type"));
        acc.setBankName(rs.getString("bank_name"));
        acc.setCurrentBalance(rs.getBigDecimal("current_balance"));
        return acc;
    }

    @Override
    public Optional<TrustAccount> findById(Long id) throws DatabaseOperationException {
        String sql = "SELECT account_id, account_number, account_name, account_type, bank_name, current_balance FROM trust_account WHERE account_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
            return Optional.empty();
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error finding trust account id: " + id, e);
        }
    }

    @Override
    public List<TrustAccount> findAll() throws DatabaseOperationException {
        List<TrustAccount> list = new ArrayList<>();
        String sql = "SELECT account_id, account_number, account_name, account_type, bank_name, current_balance FROM trust_account ORDER BY account_id ASC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapResultSet(rs));
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error finding all trust accounts", e);
        }
    }

    @Override
    public TrustAccount save(TrustAccount entity) throws DatabaseOperationException {
        String sql = "INSERT INTO trust_account (account_number, account_name, account_type, bank_name, current_balance, version) VALUES (?, ?, ?, ?, ?, 1)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, entity.getAccountNumber());
            stmt.setString(2, entity.getAccountName());
            stmt.setString(3, entity.getAccountType());
            stmt.setString(4, entity.getBankName());
            stmt.setBigDecimal(5, entity.getCurrentBalance());
            stmt.executeUpdate();
            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    entity.setId(rs.getLong(1));
                }
            }
            LOGGER.info("Saved trust account: " + entity.getAccountNumber());
            return entity;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error saving trust account: " + entity.getAccountNumber(), e);
        }
    }

    @Override
    public boolean update(TrustAccount entity) throws DatabaseOperationException {
        String sql = "UPDATE trust_account SET account_name = ?, account_type = ?, bank_name = ?, current_balance = ? WHERE account_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, entity.getAccountName());
            stmt.setString(2, entity.getAccountType());
            stmt.setString(3, entity.getBankName());
            stmt.setBigDecimal(4, entity.getCurrentBalance());
            stmt.setLong(5, entity.getId());
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error updating trust account: " + entity.getId(), e);
        }
    }

    @Override
    public boolean deleteById(Long id) throws DatabaseOperationException {
        String sql = "DELETE FROM trust_account WHERE account_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error deleting trust account: " + id, e);
        }
    }

    @Override
    public long count() throws DatabaseOperationException {
        String sql = "SELECT COUNT(*) FROM trust_account";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) return rs.getLong(1);
            return 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error counting trust accounts", e);
        }
    }

    @Override
    public Optional<TrustAccount> findByAccountNumber(String accountNumber) throws DatabaseOperationException {
        String sql = "SELECT account_id, account_number, account_name, account_type, bank_name, current_balance FROM trust_account WHERE account_number = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, accountNumber);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) return Optional.of(mapResultSet(rs));
            }
            return Optional.empty();
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error searching account number: " + accountNumber, e);
        }
    }

    /**
     * Unit 4: Transaction Management (Atomic Fund Transfer with Rollback)
     */
    @Override
    public void transferFunds(Long fromAccountId, Long toAccountId, BigDecimal amount) 
            throws DatabaseOperationException, InsufficientTrustFundsException {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive.");
        }

        Connection conn = null;
        try {
            conn = DatabaseConfig.getConnection();
            conn.setAutoCommit(false); // Begin Unit 4 Transaction

            // 1. Fetch and Lock Source Account
            String selectSourceSql = "SELECT current_balance FROM trust_account WHERE account_id = ? FOR UPDATE";
            BigDecimal sourceBalance;
            try (PreparedStatement stmt = conn.prepareStatement(selectSourceSql)) {
                stmt.setLong(1, fromAccountId);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (!rs.next()) {
                        throw new DatabaseOperationException("Source trust account ID " + fromAccountId + " does not exist.");
                    }
                    sourceBalance = rs.getBigDecimal("current_balance");
                }
            }

            // 2. Validate Trust Overdraft (Compliance Check)
            if (sourceBalance.compareTo(amount) < 0) {
                conn.rollback();
                throw new InsufficientTrustFundsException(sourceBalance, amount);
            }

            // 3. Debit Source Account
            String debitSql = "UPDATE trust_account SET current_balance = current_balance - ? WHERE account_id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(debitSql)) {
                stmt.setBigDecimal(1, amount);
                stmt.setLong(2, fromAccountId);
                stmt.executeUpdate();
            }

            // 4. Credit Destination Account
            String creditSql = "UPDATE trust_account SET current_balance = current_balance + ? WHERE account_id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(creditSql)) {
                stmt.setBigDecimal(1, amount);
                stmt.setLong(2, toAccountId);
                stmt.executeUpdate();
            }

            // 5. Commit Transaction
            conn.commit();
            LOGGER.info(String.format("Transfer of $%s from Acc#%d to Acc#%d committed successfully.", amount, fromAccountId, toAccountId));
        } catch (SQLException e) {
            if (conn != null) {
                try {
                    conn.rollback();
                    LOGGER.warning("Transfer transaction rolled back due to error: " + e.getMessage());
                } catch (SQLException rbEx) {
                    LOGGER.severe("Rollback failure: " + rbEx.getMessage());
                }
            }
            throw new DatabaseOperationException("Transfer failed: " + e.getMessage(), e);
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException ignored) {}
            }
        }
    }
}
