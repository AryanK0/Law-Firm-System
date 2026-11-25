package com.psl.lawfirm.dao;

import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.model.Client;

import java.util.List;

/**
 * DAO Interface for Client Entity
 */
public interface ClientDAO extends GenericDAO<Client, Long> {
    List<Client> searchByName(String keyword) throws DatabaseOperationException;
}
