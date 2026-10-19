package com.psl.lawfirm.dao;

import com.psl.lawfirm.exception.DatabaseOperationException;

import java.util.List;
import java.util.Optional;

/**
 * 
 * Generic Data Access Object (DAO) Interface demonstrating:
 * - Generics and type safety: <T, ID>
 * - DAO Design Pattern for Data Access Layer
 * - Standard CRUD Operations
 */
public interface GenericDAO<T, ID> {
    Optional<T> findById(ID id) throws DatabaseOperationException;
    List<T> findAll() throws DatabaseOperationException;
    T save(T entity) throws DatabaseOperationException;
    boolean update(T entity) throws DatabaseOperationException;
    boolean deleteById(ID id) throws DatabaseOperationException;
    long count() throws DatabaseOperationException;
}
