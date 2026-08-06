package com.syncpad.api.documents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddCommentReplyRequest(

        @NotBlank
        @Size(max = 10_000)
        String message

) {
}