package com.syncpad.api.documents;

public class DocumentValidationException extends RuntimeException {

    public DocumentValidationException(String message) {
        super(message);
    }
}