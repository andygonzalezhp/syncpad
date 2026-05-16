package com.syncpad.api.documents;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ShareDocumentRequest(
        @NotBlank
        @Email
        String email,

        @NotNull
        DocumentRole role
) {
}