package com.psl.lawfirm.exception;

/**
 * Custom Exceptions
 * Thrown when an entity (Case, Client, Account) cannot be found.
 */
public class ResourceNotFoundException extends LawFirmException {
    public ResourceNotFoundException(String entityType, Object id) {
        super("ERR_NOT_FOUND", String.format("%s with ID '%s' was not found in the repository.", entityType, id));
    }
}
