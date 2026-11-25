package com.psl.lawfirm.dao;

import com.psl.lawfirm.config.DatabaseConfig;
import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.model.SupportTicket;
import com.psl.lawfirm.util.LoggerUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * Support Ticket DAO Implementation with JDBC PreparedStatement
 */
public class SupportTicketDAOImpl implements SupportTicketDAO {
    private static final Logger LOGGER = LoggerUtil.getLogger(SupportTicketDAOImpl.class);

    private SupportTicket mapResultSet(ResultSet rs) throws SQLException {
        SupportTicket t = new SupportTicket();
        t.setId(rs.getLong("ticket_id"));
        t.setRaisedBy(rs.getLong("raised_by"));
        t.setDescription(rs.getString("description"));
        t.setPriority(rs.getString("priority"));
        t.setStatus(rs.getString("status"));
        
        long assignedTo = rs.getLong("assigned_to");
        if (!rs.wasNull()) {
            t.setAssignedTo(assignedTo);
        }
        t.setBreachFlag(rs.getBoolean("breach_flag"));
        return t;
    }

    @Override
    public Optional<SupportTicket> findById(Long id) throws DatabaseOperationException {
        String sql = "SELECT ticket_id, raised_by, description, priority, status, assigned_to, breach_flag FROM ticket WHERE ticket_id = ?";
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
            throw new DatabaseOperationException("Error finding ticket by id: " + id, e);
        }
    }

    @Override
    public List<SupportTicket> findAll() throws DatabaseOperationException {
        List<SupportTicket> list = new ArrayList<>();
        String sql = "SELECT ticket_id, raised_by, description, priority, status, assigned_to, breach_flag FROM ticket ORDER BY ticket_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapResultSet(rs));
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error fetching tickets", e);
        }
    }

    @Override
    public SupportTicket save(SupportTicket entity) throws DatabaseOperationException {
        String sql = "INSERT INTO ticket (raised_by, description, priority, status, assigned_to, breach_flag) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setLong(1, entity.getRaisedBy() != null ? entity.getRaisedBy() : 1L);
            stmt.setString(2, entity.getDescription());
            stmt.setString(3, entity.getPriority());
            stmt.setString(4, entity.getStatus());
            if (entity.getAssignedTo() != null) {
                stmt.setLong(5, entity.getAssignedTo());
            } else {
                stmt.setNull(5, Types.INTEGER);
            }
            stmt.setBoolean(6, entity.isBreachFlag());
            stmt.executeUpdate();
            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    entity.setId(rs.getLong(1));
                }
            }
            return entity;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error inserting ticket: " + entity.getDescription(), e);
        }
    }

    @Override
    public boolean update(SupportTicket entity) throws DatabaseOperationException {
        String sql = "UPDATE ticket SET description = ?, priority = ?, status = ?, breach_flag = ? WHERE ticket_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, entity.getDescription());
            stmt.setString(2, entity.getPriority());
            stmt.setString(3, entity.getStatus());
            stmt.setBoolean(4, entity.isBreachFlag());
            stmt.setLong(5, entity.getId());
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error updating ticket: " + entity.getId(), e);
        }
    }

    @Override
    public boolean deleteById(Long id) throws DatabaseOperationException {
        String sql = "DELETE FROM ticket WHERE ticket_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error deleting ticket: " + id, e);
        }
    }

    @Override
    public long count() throws DatabaseOperationException {
        String sql = "SELECT COUNT(*) FROM ticket";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) return rs.getLong(1);
            return 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error counting tickets", e);
        }
    }

    @Override
    public List<SupportTicket> findOpenTickets() throws DatabaseOperationException {
        List<SupportTicket> list = new ArrayList<>();
        String sql = "SELECT ticket_id, raised_by, description, priority, status, assigned_to, breach_flag FROM ticket WHERE status != 'Resolved' AND status != 'Closed' ORDER BY ticket_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapResultSet(rs));
            }
            return list;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error querying open tickets", e);
        }
    }
}
