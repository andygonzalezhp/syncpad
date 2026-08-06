package com.syncpad.api.documents;

import java.util.UUID;

public record CommentAuthorResponse(
        UUID id,
        String email,
        String displayName
) {

    public static CommentAuthorResponse from(AppUser user) {
        if (user == null) {
            return null;
        }

        return new CommentAuthorResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName()
        );
    }
}