package com.syncpad.api.documents;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String title,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        DocumentRole role
) {
    public static DocumentResponse from(Document document, DocumentRole role) {
        return new DocumentResponse(
                document.getId(),
                document.getTitle(),
                document.getCreatedAt(),
                document.getUpdatedAt(),
                role
        );
    }
}