package com.syncpad.api.documents;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentPermissionResponse(
        UUID id,
        String userEmail,
        String displayName,
        DocumentRole role,
        OffsetDateTime createdAt
) {
    public static DocumentPermissionResponse from(DocumentPermission permission) {
        AppUser user = permission.getUser();

        return new DocumentPermissionResponse(
                permission.getId(),
                user.getEmail(),
                user.getDisplayName(),
                permission.getRole(),
                permission.getCreatedAt()
        );
    }
}