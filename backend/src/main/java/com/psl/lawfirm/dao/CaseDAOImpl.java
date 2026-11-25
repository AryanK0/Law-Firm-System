package com.psl.lawfirm.dao;

import com.psl.lawfirm.config.DatabaseConfig;
import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.model.CaseEntity;
import com.psl.lawfirm.util.LoggerUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * Case DAO Implementation with JDBC PreparedStatement & ResultSet
 */
public class CaseDAOImpl implements CaseDAO {
    private static final Logger LOGGER = LoggerUtil.getLogger(CaseDAOImpl.class);

    private CaseEntity mapResultSet(ResultSet rs) throws SQLException {
        CaseEntity c = new CaseEntity();
        c.setId(rs.getLong("case_id"));
        c.setCaseCode(rs.getString("case_code"));
        c.setTitle(rs.getString("title"));
        c.setDescription(rs.getString("description"));
        c.setCaseType(rs.getString("case_type"));
        c.setClientId(rs.getLong("client_id"));
        c.setStatus(rs.getString("status"));
        c.setConfidentialityLevel(rs.getString("confidentiality_level"));
        
        Date startDate = rs.getDate("start_date");
        if (startDate != null) {
            c.setStartDate(startDate.toLocalDate());
        }
        Date endDate = rs.getDate("end_date");
        if (endDate != null) {
            c.setEndDate(endDate.toLocalDate());
        }
        c.setLegalHold(rs.getBoolean("legal_hold"));
        c.setOpposingParty(rs.getString("opposing_party"));
        c.setOpposingCounsel(rs.getString("opposing_counsel"));

        // Join column if present
        try {
            c.setClientName(rs.getString("client_name"));
        } catch (SQLException ignored) {
            // client_name was not included in this query projection
        }
        return c;
    }

    private static final String SELECT_BASE = 
        "SELECT c.case_id, c.case_code, c.title, c.description, c.case_type, c.client_id, " +
        "c.status, c.confidentiality_level, c.start_date, c.end_date, c.legal_hold, " +
        "c.opposing_party, c.opposing_counsel, cl.name AS client_name " +
        "FROM cases c " +
        "LEFT JOIN client cl ON c.client_id = cl.client_id ";

    @Override
    public Optional<CaseEntity> findById(Long id) throws DatabaseOperationException {
        String sql = SELECT_BASE + "WHERE c.case_id = ?";
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
            throw new DatabaseOperationException("Error fetching case id: " + id, e);
        }
    }

    @Override
    public List<CaseEntity> findAll() throws DatabaseOperationException {
        List<CaseEntity> list = new ArrayList<>();
        String sql = SELECT_BASE + "ORDER BY c.case_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapResultSet(rs));
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error fetching all cases", e);
        }
    }

    @Override
    public CaseEntity save(CaseEntity entity) throws DatabaseOperationException {
        String sql = "INSERT INTO cases (case_code, title, description, case_type, client_id, status, " +
                     "confidentiality_level, start_date, legal_hold, opposing_party, opposing_counsel, version) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, entity.getCaseCode());
            stmt.setString(2, entity.getTitle());
            stmt.setString(3, entity.getDescription());
            stmt.setString(4, entity.getCaseType());
            stmt.setLong(5, entity.getClientId());
            stmt.setString(6, entity.getStatus());
            stmt.setString(7, entity.getConfidentialityLevel());
            stmt.setDate(8, entity.getStartDate() != null ? Date.valueOf(entity.getStartDate()) : Date.valueOf(java.time.LocalDate.now()));
            stmt.setBoolean(9, entity.isLegalHold());
            stmt.setString(10, entity.getOpposingParty());
            stmt.setString(11, entity.getOpposingCounsel());

            int affected = stmt.executeUpdate();
            if (affected == 0) {
                throw new DatabaseOperationException("Failed to insert case, no rows affected.");
            }
            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    entity.setId(generatedKeys.getLong(1));
                }
            }
            LOGGER.info("Successfully inserted Case: " + entity.getCaseCode());
            return entity;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error creating case: " + entity.getTitle(), e);
        }
    }

    @Override
    public boolean update(CaseEntity entity) throws DatabaseOperationException {
        String sql = "UPDATE cases SET title = ?, description = ?, status = ?, case_type = ?, " +
                     "confidentiality_level = ?, legal_hold = ?, opposing_party = ?, opposing_counsel = ? " +
                     "WHERE case_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, entity.getTitle());
            stmt.setString(2, entity.getDescription());
            stmt.setString(3, entity.getStatus());
            stmt.setString(4, entity.getCaseType());
            stmt.setString(5, entity.getConfidentialityLevel());
            stmt.setBoolean(6, entity.isLegalHold());
            stmt.setString(7, entity.getOpposingParty());
            stmt.setString(8, entity.getOpposingCounsel());
            stmt.setLong(9, entity.getId());

            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error updating case id: " + entity.getId(), e);
        }
    }

    @Override
    public boolean deleteById(Long id) throws DatabaseOperationException {
        String sql = "DELETE FROM cases WHERE case_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error deleting case id: " + id, e);
        }
    }

    @Override
    public long count() throws DatabaseOperationException {
        String sql = "SELECT COUNT(*) FROM cases";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getLong(1);
            }
            return 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error counting cases", e);
        }
    }

    @Override
    public List<CaseEntity> findByStatus(String status) throws DatabaseOperationException {
        List<CaseEntity> list = new ArrayList<>();
        String sql = SELECT_BASE + "WHERE c.status = ? ORDER BY c.case_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSet(rs));
                }
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error fetching cases by status: " + status, e);
        }
    }

    @Override
    public List<CaseEntity> findByClientId(Long clientId) throws DatabaseOperationException {
        List<CaseEntity> list = new ArrayList<>();
        String sql = SELECT_BASE + "WHERE c.client_id = ? ORDER BY c.case_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, clientId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSet(rs));
                }
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error fetching cases for clientId: " + clientId, e);
        }
    }

    @Override
    public List<CaseEntity> search(String keyword) throws DatabaseOperationException {
        List<CaseEntity> list = new ArrayList<>();
        String sql = SELECT_BASE + "WHERE c.title LIKE ? OR c.case_code LIKE ? OR c.opposing_party LIKE ? ORDER BY c.case_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String wildcard = "%" + keyword + "%";
            stmt.setString(1, wildcard);
            stmt.setString(2, wildcard);
            stmt.setString(3, wildcard);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSet(rs));
                }
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error searching cases with query: " + keyword, e);
        }
    }
}
