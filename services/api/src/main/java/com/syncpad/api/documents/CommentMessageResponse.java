package com.syncpad.api.documents;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CommentMessageResponse(
        UUID id,
        CommentAuthorResponse author,
        String body,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static CommentMessageResponse from(CommentMessage message) {
        return new CommentMessageResponse(
                message.getId(),
                CommentAuthorResponse.from(message.getAuthor()),
                message.getBody(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }
}