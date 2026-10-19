package com.psl.lawfirm.dao;

import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.exception.InsufficientTrustFundsException;
import com.psl.lawfirm.model.TrustAccount;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Trust Account DAO Interface
 */
public interface TrustAccountDAO extends GenericDAO<TrustAccount, Long> {
    Optional<TrustAccount> findByAccountNumber(String accountNumber) throws DatabaseOperationException;
    void transferFunds(Long fromAccountId, Long toAccountId, BigDecimal amount) 
            throws DatabaseOperationException, InsufficientTrustFundsException;
}
