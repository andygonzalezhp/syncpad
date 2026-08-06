package com.syncpad.api.documents;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents/{documentId}/comments")
public class DocumentCommentController {

    private static final Logger log = LoggerFactory.getLogger(
            DocumentCommentController.class
    );

    private final DocumentCommentService documentCommentService;

    public DocumentCommentController(
            DocumentCommentService documentCommentService
    ) {
        this.documentCommentService = documentCommentService;
    }

    @GetMapping
    public List<CommentThreadResponse> listComments(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentCommentService.listComments(
                documentId,
                currentUserEmail(jwt)
        );
    }

    @GetMapping("/{threadId}")
    public CommentThreadResponse getComment(
            @PathVariable UUID documentId,
            @PathVariable UUID threadId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentCommentService.getComment(
                documentId,
                threadId,
                currentUserEmail(jwt)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentThreadResponse createComment(
            @PathVariable UUID documentId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentCommentService.createComment(
                documentId,
                request,
                currentUserEmail(jwt)
        );
    }

    @PostMapping("/{threadId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentThreadResponse addReply(
            @PathVariable UUID documentId,
            @PathVariable UUID threadId,
            @Valid @RequestBody AddCommentReplyRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        log.info(
                "Comment reply request received documentId={} threadId={} messageLength={}",
                documentId,
                threadId,
                request.message().length()
        );

        CommentThreadResponse response = documentCommentService.addReply(
                documentId,
                threadId,
                request,
                currentUserEmail(jwt)
        );

        log.info(
                "Comment reply request succeeded documentId={} threadId={} status={} messageCount={}",
                documentId,
                threadId,
                response.status(),
                response.messages().size()
        );

        return response;
    }

    @PatchMapping("/{threadId}/resolve")
    public CommentThreadResponse resolveComment(
            @PathVariable UUID documentId,
            @PathVariable UUID threadId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        log.info(
                "Comment resolve request received documentId={} threadId={}",
                documentId,
                threadId
        );

        CommentThreadResponse response = documentCommentService.resolveComment(
                documentId,
                threadId,
                currentUserEmail(jwt)
        );

        log.info(
                "Comment resolve request succeeded documentId={} threadId={} status={} resolvedBy={} resolvedAt={}",
                documentId,
                threadId,
                response.status(),
                response.resolvedBy() == null
                        ? null
                        : response.resolvedBy().id(),
                response.resolvedAt()
        );

        return response;
    }

    @PatchMapping("/{threadId}/reopen")
    public CommentThreadResponse reopenComment(
            @PathVariable UUID documentId,
            @PathVariable UUID threadId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        log.info(
                "Comment reopen request received documentId={} threadId={}",
                documentId,
                threadId
        );

        CommentThreadResponse response = documentCommentService.reopenComment(
                documentId,
                threadId,
                currentUserEmail(jwt)
        );

        log.info(
                "Comment reopen request succeeded documentId={} threadId={} status={} resolvedBy={} resolvedAt={}",
                documentId,
                threadId,
                response.status(),
                response.resolvedBy() == null
                        ? null
                        : response.resolvedBy().id(),
                response.resolvedAt()
        );

        return response;
    }

    private String currentUserEmail(Jwt jwt) {
        if (jwt == null) {
            throw new DocumentValidationException(
                    "Missing authenticated user."
            );
        }

        String email = jwt.getClaimAsString("email");

        if (email == null || email.isBlank()) {
            throw new DocumentValidationException(
                    "Authenticated Clerk token is missing email claim. "
                    + "Check the syncpad JWT template."
            );
        }

        return email.trim().toLowerCase();
    }
}
