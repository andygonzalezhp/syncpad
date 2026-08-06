package com.syncpad.api.documents;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CommentThreadResponse(
        UUID id,
        UUID documentId,
        String selectedText,
        CommentStatus status,
        CommentAuthorResponse createdBy,
        CommentAuthorResponse resolvedBy,
        OffsetDateTime resolvedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<CommentMessageResponse> messages
) {

    public static CommentThreadResponse from(CommentThread thread) {
        List<CommentMessageResponse> messageResponses = thread.getMessages()
                .stream()
                .map(CommentMessageResponse::from)
                .toList();

        return new CommentThreadResponse(
                thread.getId(),
                thread.getDocument().getId(),
                thread.getSelectedText(),
                thread.getStatus(),
                CommentAuthorResponse.from(thread.getCreatedBy()),
                CommentAuthorResponse.from(thread.getResolvedBy()),
                thread.getResolvedAt(),
                thread.getCreatedAt(),
                thread.getUpdatedAt(),
                messageResponses
        );
    }
}