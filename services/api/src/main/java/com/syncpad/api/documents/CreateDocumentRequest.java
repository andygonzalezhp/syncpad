package com.syncpad.api.documents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDocumentRequest(
        @NotBlank
        @Size(max = 255)
        String title
) {
}