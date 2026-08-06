package com.syncpad.api.documents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCommentRequest(

        @NotBlank
        @Size(max = 2_000)
        String selectedText,

        @NotBlank
        @Size(max = 10_000)
        String message

) {
}