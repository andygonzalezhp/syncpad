package com.syncpad.api.documents;

import java.util.UUID;

public class DocumentAccessDeniedException extends RuntimeException {

    public DocumentAccessDeniedException(UUID documentId) {
        super("You do not have permission to modify document: " + documentId);
    }
}