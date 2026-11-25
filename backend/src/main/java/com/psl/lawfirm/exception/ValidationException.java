package com.psl.lawfirm.exception;

/**
 * Custom Exceptions
 * Thrown when domain or UI validation rules fail.
 */
public class ValidationException extends LawFirmException {
    private final String fieldName;

    public ValidationException(String fieldName, String message) {
        super("ERR_VALIDATION", String.format("Validation failed on [%s]: %s", fieldName, message));
        this.fieldName = fieldName;
    }

    public String getFieldName() {
        return fieldName;
    }
}
