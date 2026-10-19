package com.psl.lawfirm.exception;

/**
 * Exception Hierarchy
 * Base application exception for Law Firm Management System.
 */
public class LawFirmException extends Exception {
    private final String errorCode;

    public LawFirmException(String message) {
        super(message);
        this.errorCode = "ERR_GENERAL";
    }

    public LawFirmException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public LawFirmException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
