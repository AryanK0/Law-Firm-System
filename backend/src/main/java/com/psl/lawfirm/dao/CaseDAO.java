package com.psl.lawfirm.dao;

import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.model.CaseEntity;

import java.util.List;

/**
 * Case DAO Interface
 */
public interface CaseDAO extends GenericDAO<CaseEntity, Long> {
    List<CaseEntity> findByStatus(String status) throws DatabaseOperationException;
    List<CaseEntity> findByClientId(Long clientId) throws DatabaseOperationException;
    List<CaseEntity> search(String keyword) throws DatabaseOperationException;
}
