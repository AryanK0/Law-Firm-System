package com.psl.lawfirm.dao;

import com.psl.lawfirm.config.DatabaseConfig;
import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.model.Client;
import com.psl.lawfirm.util.LoggerUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * JDBC DAO Implementation for Client
 * Demonstrates:
 * - PreparedStatement and ResultSet usage
 * - SQL INSERT, UPDATE, DELETE, SELECT
 * - Exception wrapping into custom DatabaseOperationException
 */
public class ClientDAOImpl implements ClientDAO {
    private static final Logger LOGGER = LoggerUtil.getLogger(ClientDAOImpl.class);

    private Client mapResultSet(ResultSet rs) throws SQLException {
        Client client = new Client();
        client.setId(rs.getLong("client_id"));
        client.setName(rs.getString("name"));
        client.setContactInfo(rs.getString("contact_info"));
        client.setOrganization(rs.getString("organization"));
        return client;
    }

    @Override
    public Optional<Client> findById(Long id) throws DatabaseOperationException {
        String sql = "SELECT client_id, name, contact_info, organization FROM client WHERE client_id = ?";
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
            throw new DatabaseOperationException("Error fetching client by id: " + id, e);
        }
    }

    @Override
    public List<Client> findAll() throws DatabaseOperationException {
        List<Client> clients = new ArrayList<>();
        String sql = "SELECT client_id, name, contact_info, organization FROM client ORDER BY client_id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                clients.add(mapResultSet(rs));
            }
            return clients;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error retrieving all clients", e);
        }
    }

    @Override
    public Client save(Client client) throws DatabaseOperationException {
        String sql = "INSERT INTO client (name, contact_info, organization) VALUES (?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, client.getName());
            stmt.setString(2, client.getContactInfo());
            stmt.setString(3, client.getOrganization());
            int affected = stmt.executeUpdate();
            if (affected == 0) {
                throw new DatabaseOperationException("Creating client failed, no rows affected.");
            }
            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    client.setId(generatedKeys.getLong(1));
                }
            }
            LOGGER.info("Saved new client: " + client);
            return client;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error saving client: " + client.getName(), e);
        }
    }

    @Override
    public boolean update(Client client) throws DatabaseOperationException {
        String sql = "UPDATE client SET name = ?, contact_info = ?, organization = ? WHERE client_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, client.getName());
            stmt.setString(2, client.getContactInfo());
            stmt.setString(3, client.getOrganization());
            stmt.setLong(4, client.getId());
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error updating client id: " + client.getId(), e);
        }
    }

    @Override
    public boolean deleteById(Long id) throws DatabaseOperationException {
        String sql = "DELETE FROM client WHERE client_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error deleting client id: " + id, e);
        }
    }

    @Override
    public long count() throws DatabaseOperationException {
        String sql = "SELECT COUNT(*) FROM client";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getLong(1);
            }
            return 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error counting clients", e);
        }
    }

    @Override
    public List<Client> searchByName(String keyword) throws DatabaseOperationException {
        List<Client> results = new ArrayList<>();
        String sql = "SELECT client_id, name, contact_info, organization FROM client WHERE name LIKE ? OR organization LIKE ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String wildcard = "%" + keyword + "%";
            stmt.setString(1, wildcard);
            stmt.setString(2, wildcard);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    results.add(mapResultSet(rs));
                }
            }
            return results;
        } catch (SQLException e) {
            throw new DatabaseOperationException("Error searching clients with query: " + keyword, e);
        }
    }
}
