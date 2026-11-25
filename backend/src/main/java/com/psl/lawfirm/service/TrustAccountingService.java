package com.psl.lawfirm.service;

import com.psl.lawfirm.dao.TrustAccountDAO;
import com.psl.lawfirm.dao.TrustAccountDAOImpl;
import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.exception.InsufficientTrustFundsException;
import com.psl.lawfirm.exception.ValidationException;
import com.psl.lawfirm.model.TrustAccount;
import com.psl.lawfirm.util.LoggerUtil;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * 
 * Service managing IOLTA and Operating accounts with strict compliance rules.
 */
public class TrustAccountingService {
    private static final Logger LOGGER = LoggerUtil.getLogger(TrustAccountingService.class);
    private final TrustAccountDAO trustAccountDAO;

    public TrustAccountingService() {
        this.trustAccountDAO = new TrustAccountDAOImpl();
    }

    public TrustAccountingService(TrustAccountDAO trustAccountDAO) {
        this.trustAccountDAO = trustAccountDAO;
    }

    public List<TrustAccount> getAllAccounts() throws DatabaseOperationException {
        return trustAccountDAO.findAll();
    }

    public Optional<TrustAccount> getAccountById(Long id) throws DatabaseOperationException {
        return trustAccountDAO.findById(id);
    }

    public void processTransfer(Long fromId, Long toId, BigDecimal amount) 
            throws ValidationException, DatabaseOperationException, InsufficientTrustFundsException {
        if (fromId == null || toId == null || fromId.equals(toId)) {
            throw new ValidationException("accounts", "Source and destination accounts must be distinct and non-null.");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("amount", "Transfer amount must be strictly greater than zero.");
        }

        LOGGER.info(String.format("Initiating transfer of $%s from account #%d to account #%d", amount, fromId, toId));
        trustAccountDAO.transferFunds(fromId, toId, amount);
    }

    public BigDecimal calculateTotalManagedFunds() throws DatabaseOperationException {
        List<TrustAccount> accounts = getAllAccounts();
        BigDecimal total = BigDecimal.ZERO;
        for (TrustAccount acc : accounts) {
            if (acc.getCurrentBalance() != null) {
                total = total.add(acc.getCurrentBalance());
            }
        }
        return total;
    }
}
