package com.psl.lawfirm.exception;

/**
 * Custom Exceptions for Database Errors
 * Wraps SQLExceptions into domain-friendly runtime/checked exceptions.
 */
public class DatabaseOperationException extends LawFirmException {
    public DatabaseOperationException(String message, Throwable cause) {
        super("ERR_DATABASE_OP", message, cause);
    }

    public DatabaseOperationException(String message) {
        super("ERR_DATABASE_OP", message);
    }
}
