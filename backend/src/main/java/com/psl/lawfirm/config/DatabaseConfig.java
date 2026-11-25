package com.psl.lawfirm.config;

import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.util.LoggerUtil;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.logging.Logger;

/**
 * JDBC and Database Connectivity
 * Manages JDBC Driver, Connection lifecycle, and Transaction Management.
 */
public class DatabaseConfig {
    private static final Logger LOGGER = LoggerUtil.getLogger(DatabaseConfig.class);

    private static String dbUrl;
    private static String dbUser;
    private static String dbPassword;
    private static String dbDriver;

    static {
        loadConfiguration();
    }

    private static void loadConfiguration() {
        dbDriver = AppProperties.getProperty("db.driver", "com.mysql.cj.jdbc.Driver");
        dbUrl = AppProperties.getProperty("db.url", "jdbc:mysql://localhost:3306/lawfirm?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
        dbUser = AppProperties.getProperty("db.user", "root");
        dbPassword = AppProperties.getProperty("db.password", "Ar@230806.");

        try {
            Class.forName(dbDriver);
            LOGGER.info("JDBC Driver loaded successfully: " + dbDriver);
        } catch (ClassNotFoundException e) {
            LOGGER.severe("Failed to load JDBC driver: " + dbDriver + ". Error: " + e.getMessage());
        }
    }

    /**
     * Obtains a standard fresh JDBC connection.
     */
    public static Connection getConnection() throws DatabaseOperationException {
        try {
            return DriverManager.getConnection(dbUrl, dbUser, dbPassword);
        } catch (SQLException e) {
            String errorMsg = "Failed to establish JDBC Connection to: " + dbUrl + " with user: " + dbUser;
            LOGGER.severe(errorMsg + " Reason: " + e.getMessage());
            throw new DatabaseOperationException(errorMsg, e);
        }
    }

    /**
     * Tests database connectivity.
     */
    public static boolean testConnection() {
        try (Connection conn = getConnection()) {
            boolean valid = conn != null && !conn.isClosed() && conn.isValid(3);
            LOGGER.info("Database connectivity test: " + (valid ? "SUCCESS" : "FAILED"));
            return valid;
        } catch (Exception e) {
            LOGGER.warning("Database connectivity test failed: " + e.getMessage());
            return false;
        }
    }

    /**
     * Executes a transaction callback ensuring commit or rollback.
     */
    @FunctionalInterface
    public interface TransactionAction<T> {
        T execute(Connection conn) throws Exception;
    }

    public static <T> T executeInTransaction(TransactionAction<T> action) throws DatabaseOperationException {
        Connection conn = null;
        try {
            conn = getConnection();
            conn.setAutoCommit(false); // Unit 4: Transaction management
            T result = action.execute(conn);
            conn.commit();
            LOGGER.fine("Transaction committed successfully.");
            return result;
        } catch (Exception e) {
            if (conn != null) {
                try {
                    conn.rollback();
                    LOGGER.warning("Transaction rolled back due to error: " + e.getMessage());
                } catch (SQLException rollbackEx) {
                    LOGGER.severe("Failed to rollback transaction: " + rollbackEx.getMessage());
                }
            }
            if (e instanceof DatabaseOperationException) {
                throw (DatabaseOperationException) e;
            }
            throw new DatabaseOperationException("Transaction failed: " + e.getMessage(), e);
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException e) {
                    LOGGER.warning("Error closing connection: " + e.getMessage());
                }
            }
        }
    }
}
