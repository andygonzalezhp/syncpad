package com.syncpad.api.documents;

import java.util.UUID;

public class CommentNotFoundException extends RuntimeException {

    public CommentNotFoundException(UUID documentId, UUID threadId) {
        super(
                "Comment thread %s was not found in document %s."
                        .formatted(threadId, documentId)
        );
    }
}