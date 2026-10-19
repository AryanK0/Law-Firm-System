package com.psl.lawfirm.exception;

import java.math.BigDecimal;

/**
 * Custom Business Exception
 * Enforces legal compliance rules: Trust accounts cannot be overdrawn under Bar Association regulations.
 */
public class InsufficientTrustFundsException extends LawFirmException {
    private final BigDecimal currentBalance;
    private final BigDecimal attemptedAmount;

    public InsufficientTrustFundsException(BigDecimal currentBalance, BigDecimal attemptedAmount) {
        super("ERR_TRUST_OVERDRAFT", String.format(
            "IOLTA Compliance Violation: Attempted withdrawal of $%s exceeds available trust balance of $%s.",
            attemptedAmount, currentBalance
        ));
        this.currentBalance = currentBalance;
        this.attemptedAmount = attemptedAmount;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public BigDecimal getAttemptedAmount() {
        return attemptedAmount;
    }
}
