package com.psl.lawfirm.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * , Unit 2, Unit 4
 * Trust Account Entity mapped to MySQL `trust_account` table.
 * Demonstrates:
 * - High-precision monetary management (BigDecimal, RoundingMode)
 * - State encapsulation & validation methods
 */
public class TrustAccount extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String accountNumber;
    private String accountName;
    private String accountType; // 'IOLTA_TRUST' or 'OPERATING'
    private String bankName;
    private BigDecimal currentBalance;

    public TrustAccount() {
        super();
        this.currentBalance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    public TrustAccount(Long id, String accountNumber, String accountName, String accountType, String bankName, BigDecimal currentBalance) {
        super(id);
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.accountType = accountType;
        this.bankName = bankName;
        this.currentBalance = currentBalance != null ? currentBalance.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    public boolean isIolta() {
        return "IOLTA_TRUST".equalsIgnoreCase(accountType);
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public String getAccountType() {
        return accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance != null ? currentBalance.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public String toString() {
        return String.format("TrustAccount[num='%s', type='%s', balance=$%s]", accountNumber, accountType, currentBalance);
    }
}
